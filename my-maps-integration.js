// my-maps-integration.js - Integração com Google My Maps

class MyMapsIntegration {
    constructor(config) {
        this.config = config;
        this.mapData = null;
        this.layers = {};
    }
    
    /**
     * Carrega dados do Google My Maps
     * Método 1: Via KML export (recomendado)
     * Método 2: Via API (requer chave)
     */
    async loadMyMapsData() {
        try {
            // Tentar carregar via KML exportado
            const kmlData = await this.loadKMLExport();
            
            if (kmlData) {
                this.mapData = this.parseKMLToGeoJSON(kmlData);
                return this.mapData;
            }
            
            // Fallback: embed do mapa
            return await this.loadViaEmbed();
            
        } catch (error) {
            console.error('Erro ao carregar My Maps:', error);
            return this.getEmbedMap();
        }
    }
    
    /**
     * Método 1: Carregar KML exportado
     * Passos para você:
     * 1. No My Maps → 3 pontos → Exportar para KML
     * 2. Subir o KML para um servidor web
     * 3. Colocar o link aqui
     */
    async loadKMLExport() {
        // LINKS DOS SEUS MAPAS EXPORTADOS (substitua com seus links)
        const kmlUrls = {
            geoprocessamento: "https://seu-site.com/maps/geoprocessamento.kml",
            sensoriamento: "https://seu-site.com/maps/sensoriamento.kml",
            cartografia: "https://seu-site.com/maps/cartografia.kml"
        };
        
        const allFeatures = [];
        
        for (const [layerName, url] of Object.entries(kmlUrls)) {
            try {
                const response = await fetch(url);
                const kmlText = await response.text();
                const geoJSON = await this.convertKMLToGeoJSON(kmlText);
                
                // Adicionar metadata
                geoJSON.features.forEach(feature => {
                    feature.properties.layer = layerName;
                    feature.properties.source = 'my_maps';
                    feature.properties.area = this.mapLayerToArea(layerName);
                });
                
                allFeatures.push(...geoJSON.features);
                
            } catch (error) {
                console.warn(`Erro ao carregar KML ${layerName}:`, error);
            }
        }
        
        return {
            type: "FeatureCollection",
            features: allFeatures
        };
    }
    
    /**
     * Método 2: Carregar via embed (iframe)
     */
    async loadViaEmbed() {
        // Criar iframe para embed do mapa
        const mapContainer = document.getElementById('my-maps-embed');
        
        if (!mapContainer) {
            const container = document.createElement('div');
            container.id = 'my-maps-embed';
            container.style.display = 'none'; // Invisível, só para carregar
            document.body.appendChild(container);
        }
        
        // URL do embed do seu mapa
        const embedUrl = `https://www.google.com/maps/d/embed?mid=${this.config.MY_MAPS.MAP_ID}&hl=pt-BR`;
        
        return {
            type: "embed",
            url: embedUrl,
            iframe: `<iframe src="${embedUrl}" width="100%" height="500" style="border:0;" allowfullscreen="" loading="lazy"></iframe>`
        };
    }
    
    /**
     * Converter KML para GeoJSON
     */
    async convertKMLToGeoJSON(kmlText) {
        // Usar a biblioteca toGeoJSON ou implementação simples
        try {
            // Se tiver a biblioteca @mapbox/togeojson
            if (typeof toGeoJSON === 'function') {
                const kml = new DOMParser().parseFromString(kmlText, 'text/xml');
                return toGeoJSON.kml(kml);
            }
            
            // Implementação básica para pontos
            return this.parseSimpleKML(kmlText);
            
        } catch (error) {
            console.error('Erro na conversão KML:', error);
            return this.parseSimpleKML(kmlText);
        }
    }
    
    /**
     * Parser simples de KML (para pontos)
     */
    parseSimpleKML(kmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
        
        const features = [];
        const placemarks = xmlDoc.getElementsByTagName('Placemark');
        
        Array.from(placemarks).forEach((placemark, index) => {
            const name = placemark.getElementsByTagName('name')[0]?.textContent || `Feature ${index}`;
            const description = placemark.getElementsByTagName('description')[0]?.textContent || '';
            const coordinates = placemark.getElementsByTagName('coordinates')[0]?.textContent;
            
            if (coordinates) {
                const [lng, lat] = coordinates.split(',').map(Number);
                
                features.push({
                    type: "Feature",
                    properties: {
                        name: name,
                        description: description,
                        type: "point"
                    },
                    geometry: {
                        type: "Point",
                        coordinates: [lng, lat]
                    }
                });
            }
        });
        
        return {
            type: "FeatureCollection",
            features: features
        };
    }
    
    /**
     * Mapear layer do My Maps para área
     */
    mapLayerToArea(layerName) {
        const mapping = {
            'geoprocessamento': 'cartografia',
            'sensoriamento': 'sensoriamento',
            'cartografia': 'cartografia',
            'web': 'webgis'
        };
        
        return mapping[layerName.toLowerCase()] || 'geral';
    }
    
    /**
     * Obter iframe do mapa para embed
     */
    getEmbedMap() {
        return {
            type: "iframe",
            html: `
                <div class="my-maps-container">
                    <h3><i class="fas fa-map-marked-alt"></i> Meu Mapa Interativo</h3>
                    <div class="map-embed">
                        <iframe 
                            src="https://www.google.com/maps/d/embed?mid=${this.config.MY_MAPS.MAP_ID}&hl=pt-BR" 
                            width="100%" 
                            height="500"
                            style="border: 1px solid #ddd; border-radius: 8px;"
                            allowfullscreen
                            loading="lazy">
                        </iframe>
                    </div>
                    <div class="map-links">
                        <a href="https://www.google.com/maps/d/edit?mid=${this.config.MY_MAPS.MAP_ID}" 
                           target="_blank" class="btn btn-secondary">
                            <i class="fas fa-edit"></i> Editar no My Maps
                        </a>
                        <a href="https://www.google.com/maps/d/u/0/viewer?mid=${this.config.MY_MAPS.MAP_ID}" 
                           target="_blank" class="btn btn-secondary">
                            <i class="fas fa-expand"></i> Ver em tela cheia
                        </a>
                    </div>
                </div>
            `
        };
    }
    
    /**
     * Gerar código para exportar do My Maps
     */
    static getExportInstructions() {
        return `
INSTRUÇÕES PARA EXPORTAR DO MY MAPS:
-----------------------------------------
1. Vá para seu mapa: ${this.config.MY_MAPS.EMBED_URL}
2. Clique nos 3 pontos (⋮) no canto superior esquerdo
3. Selecione "Exportar para KML/KMZ"
4. Marque "Exportar para um arquivo .KML" (não .KMZ)
5. Faça download do arquivo
6. Suba o arquivo para:
   - GitHub Gist (gist.github.com)
   - Google Drive (compartilhe como público)
   - Seu próprio servidor
7. Cole o link direto no config.js

DICA: Exporte cada camada separadamente para melhor organização!
        `;
    }
}