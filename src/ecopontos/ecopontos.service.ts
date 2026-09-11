import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

export type EcopontoProximo = {
  id: string;
  nome: string;
  endereco: string;
  materiais: string[];
  distanciaKm: number;
  latitude: number;
  longitude: number;
};

type CacheEntry = {
  expiraEm: number;
  ecopontos: EcopontoProximo[];
};

@Injectable()
export class EcopontosService {
  // Mais de uma instância pública para não depender de um único servidor.
  private readonly overpassUrls = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ];

  private readonly cache = new Map<string, CacheEntry>();

  async buscarProximos(
    latitude: number,
    longitude: number,
    limite: number,
  ) {
    this.limparCacheExpirado();

    const cacheKey =
      `${latitude.toFixed(3)}:${longitude.toFixed(3)}:${limite}`;

    const cacheSalvo = this.cache.get(cacheKey);

    if (cacheSalvo && cacheSalvo.expiraEm > Date.now()) {
      return this.montarResposta(
        latitude,
        longitude,
        cacheSalvo.ecopontos,
        true,
      );
    }

    // Começa perto; se não houver pontos suficientes, amplia a área.
    let ecopontos = await this.consultarComFallback(
      latitude,
      longitude,
      10000,
    );

    if (ecopontos.length < limite) {
      const ampliados = await this.consultarComFallback(
        latitude,
        longitude,
        25000,
      );

      ecopontos = this.mesclarSemDuplicar(
        ecopontos,
        ampliados,
      );
    }

    if (ecopontos.length < limite) {
      const ampliados = await this.consultarComFallback(
        latitude,
        longitude,
        40000,
      );

      ecopontos = this.mesclarSemDuplicar(
        ecopontos,
        ampliados,
      );
    }

    const proximos = ecopontos
      .sort((a, b) => a.distanciaKm - b.distanciaKm)
      .slice(0, limite);

    this.cache.set(cacheKey, {
      expiraEm: Date.now() + 2 * 60 * 1000,
      ecopontos: proximos,
    });

    return this.montarResposta(
      latitude,
      longitude,
      proximos,
      false,
    );
  }

  private limparCacheExpirado() {
    const agora = Date.now();

    for (const [chave, valor] of this.cache.entries()) {
      if (valor.expiraEm <= agora) {
        this.cache.delete(chave);
      }
    }
  }

  private mesclarSemDuplicar(
    atual: EcopontoProximo[],
    novos: EcopontoProximo[],
  ) {
    const mapa = new Map<string, EcopontoProximo>();

    for (const item of [...atual, ...novos]) {
      mapa.set(item.id, item);
    }

    return [...mapa.values()];
  }

  private montarResposta(
    latitude: number,
    longitude: number,
    ecopontos: EcopontoProximo[],
    cache: boolean,
  ) {
    return {
      localizacaoUsuario: {
        latitude,
        longitude,
      },
      total: ecopontos.length,
      cache,
      ecopontos,
    };
  }

  private async consultarComFallback(
    latitudeUsuario: number,
    longitudeUsuario: number,
    raioMetros: number,
  ): Promise<EcopontoProximo[]> {
    let ultimoErro: unknown = null;

    for (const url of this.overpassUrls) {
      try {
        return await this.consultarOverpass(
          url,
          latitudeUsuario,
          longitudeUsuario,
          raioMetros,
        );
      } catch (error) {
        ultimoErro = error;
      }
    }

    throw new ServiceUnavailableException(
      ultimoErro instanceof Error
        ? ultimoErro.message
        : 'Não foi possível consultar os pontos de coleta agora.',
    );
  }

  private async consultarOverpass(
    url: string,
    latitudeUsuario: number,
    longitudeUsuario: number,
    raioMetros: number,
  ): Promise<EcopontoProximo[]> {
    const query = `
      [out:json][timeout:12];
      (
        node["amenity"="recycling"](around:${raioMetros},${latitudeUsuario},${longitudeUsuario});
        way["amenity"="recycling"](around:${raioMetros},${latitudeUsuario},${longitudeUsuario});
        relation["amenity"="recycling"](around:${raioMetros},${latitudeUsuario},${longitudeUsuario});
      );
      out center tags;
    `;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      15000,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent':
            'ReciclaAI-PI/1.0 (projeto academico)',
        },
        body: new URLSearchParams({
          data: query,
        }).toString(),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Serviço de ecopontos respondeu ${response.status}`,
        );
      }

      const data =
        (await response.json()) as OverpassResponse;

      const resultado: EcopontoProximo[] = [];

      for (const element of data.elements ?? []) {
        const coordenadas =
          this.obterCoordenadas(element);

        if (!coordenadas) continue;

        const tags = element.tags ?? {};

        resultado.push({
          id: `${element.type}/${element.id}`,
          nome: this.obterNome(tags),
          endereco: this.obterEndereco(tags),
          materiais: this.obterMateriais(tags),
          distanciaKm: Number(
            this.calcularDistanciaKm(
              latitudeUsuario,
              longitudeUsuario,
              coordenadas.latitude,
              coordenadas.longitude,
            ).toFixed(2),
          ),
          latitude: coordenadas.latitude,
          longitude: coordenadas.longitude,
        });
      }

      return resultado;
    } finally {
      clearTimeout(timeout);
    }
  }

  private obterCoordenadas(
    element: OverpassElement,
  ): { latitude: number; longitude: number } | null {
    if (
      typeof element.lat === 'number' &&
      typeof element.lon === 'number'
    ) {
      return {
        latitude: element.lat,
        longitude: element.lon,
      };
    }

    if (
      typeof element.center?.lat === 'number' &&
      typeof element.center?.lon === 'number'
    ) {
      return {
        latitude: element.center.lat,
        longitude: element.center.lon,
      };
    }

    return null;
  }

  private obterNome(tags: Record<string, string>) {
    return (
      tags.name ||
      tags.operator ||
      (tags.recycling_type === 'centre'
        ? 'Ecoponto'
        : 'Ponto de coleta de recicláveis')
    );
  }

  private obterEndereco(tags: Record<string, string>) {
    if (tags['addr:full']) {
      return tags['addr:full'];
    }

    const rua = tags['addr:street'];
    const numero = tags['addr:housenumber'];
    const bairro =
      tags['addr:suburb'] || tags['addr:neighbourhood'];
    const cidade =
      tags['addr:city'] || tags['addr:municipality'];

    const partes: string[] = [];

    if (rua) {
      partes.push(numero ? `${rua}, ${numero}` : rua);
    }

    if (bairro) partes.push(bairro);
    if (cidade) partes.push(cidade);

    return partes.length
      ? partes.join(' · ')
      : 'Endereço não informado';
  }

  private obterMateriais(
    tags: Record<string, string>,
  ): string[] {
    const nomes: Record<string, string> = {
      aluminium: 'Alumínio',
      cans: 'Latas',
      cardboard: 'Papelão',
      clothes: 'Roupas',
      electrical_items: 'Eletrônicos',
      glass: 'Vidro',
      glass_bottles: 'Garrafas de vidro',
      metal: 'Metal',
      paper: 'Papel',
      plastic: 'Plástico',
      plastic_bottles: 'Garrafas PET',
      scrap_metal: 'Sucata metálica',
      small_appliances: 'Pequenos eletrodomésticos',
    };

    const materiais = Object.entries(tags)
      .filter(
        ([chave, valor]) =>
          chave.startsWith('recycling:') &&
          valor === 'yes',
      )
      .map(([chave]) => {
        const codigo = chave.replace('recycling:', '');

        return (
          nomes[codigo] ||
          codigo
            .replaceAll('_', ' ')
            .replace(/^./, (letra) =>
              letra.toUpperCase(),
            )
        );
      });

    return [...new Set(materiais)].slice(0, 8);
  }

  private calcularDistanciaKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const raioTerraKm = 6371;
    const paraRadianos = (valor: number) =>
      (valor * Math.PI) / 180;

    const deltaLat = paraRadianos(lat2 - lat1);
    const deltaLon = paraRadianos(lon2 - lon1);

    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(paraRadianos(lat1)) *
        Math.cos(paraRadianos(lat2)) *
        Math.sin(deltaLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return raioTerraKm * c;
  }
}
