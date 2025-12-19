
// data-integration.js - Integração com Google Colab

class ColabIntegration {
    constructor(config) {
        this.config = config;
        this.dataCache = {};
    }
    
    /**
     * Extrai dados do notebook do Colab
     * Método 1: Via exportação manual (recomendado inicialmente)
     * Método 2: Via API do Google Drive (se você publicar os dados)
     */
    async fetchColabData(method = 'gist') {
        try {
            switch(method) {
                case 'gist':
                    return await this.fetchFromGist();
                case 'drive':
                    return await this.fetchFromGoogleDrive();
                case 'export':
                    return await this.fetchFromExport();
                default:
                    throw new Error('Método não suportado');
            }
        } catch (error) {
            console.error('Erro ao buscar dados do Colab:', error);
            return this.getSampleData();
        }
    }
    
    /**
     * Método 1: Via Gist (exportação manual do Colab)
     * Passos para você:
     * 1. No seu Colab, exporte os dados como GeoJSON
     * 2. Salve no GitHub Gist
     * 3. Cole o link raw aqui
     */
    async fetchFromGist() {
        // Links para seus dados exportados do Colab
        const dataSources = {
            // Cole aqui os links dos seus dados exportados
            municipios_brasil: "https://gist.githubusercontent.com/seuusuario/.../raw/municipios.geojson",
            analise_solo: "https://gist.githubusercontent.com/seuusuario/.../raw/uso_solo.geojson",
            ndvi_series: "https://gist.githubusercontent.com/seuusuario/.../raw/ndvi_temporal.geojson"
        };
        
        const allData = {
            type: "FeatureCollection",
            features: []
        };
        
        // Buscar todos os datasets
        for (const [key, url] of Object.entries(dataSources)) {
            try {
                const response = await fetch(url);
                const data = await response.json();
                
                // Adicionar metadata
                data.features.forEach(feature => {
                    feature.properties.source = 'colab';
                    feature.properties.dataset = key;
                    feature.properties.area = this.detectArea(key);
                });
                
                allData.features.push(...data.features);
            } catch (error) {
                console.warn(`Erro ao carregar ${key}:`, error);
            }
        }
        
        return allData;
    }
    
    /**
     * Método 2: Via Google Drive API
     * Requer que você compartilhe os arquivos publicamente
     */
    async fetchFromGoogleDrive() {
        // IDs dos arquivos no seu Google Drive
        const fileIds = {
            mapa1: "1ABC123...",
            mapa2: "1DEF456...",
            dados: "1GHI789..."
        };
        
        const driveData = [];
        
        for (const [name, fileId] of Object.entries(fileIds)) {
            const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
            try {
                const response = await fetch(url);
                const data = await response.json();
                driveData.push({
                    name: name,
                    data: data,
                    type: 'geojson'
                });
            } catch (error) {
                console.error(`Erro ao carregar ${name}:`, error);
            }
        }
        
        return this.mergeGeoJSONData(driveData);
    }
    
    /**
     * Método 3: Via exportação programática do Colab
     * No seu Colab, adicione uma célula para exportar dados
     */
    async fetchFromExport() {
        // Endpoint que você pode criar no Colab
        const exportUrl = "https://colab.research.google.com/gist/export";
        
        const response = await fetch(exportUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                notebook_id: this.config.COLAB.NOTEBOOK_URL.split('/').pop(),
                format: 'geojson'
            })
        });
        
        return await response.json();
    }
    
    /**
     * Detectar área baseada no nome do dataset
     */
    detectArea(datasetName) {
        const keywords = {
            cartografia: ['mapa', 'carta', 'topografia', 'limite', 'município'],
            sensoriamento: ['ndvi', 'landsat', 'sentinel', 'imagem', 'satélite'],
            webgis: ['web', 'interativo', 'leaflet', 'mapbox', 'api']
        };
        
        for (const [area, words] of Object.entries(keywords)) {
            if (words.some(word => datasetName.toLowerCase().includes(word))) {
                return area;
            }
        }
        
        return 'geral';
    }
    
    /**
     * Dados de exemplo (fallback)
     */
    getSampleData() {
        return {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    properties: {
                        name: "Exemplo do Colab - Análise NDVI",
                        value: 85,
                        type: "sensoriamento",
                        date: "2024-01-15",
                        description: "Índice de vegetação - Amazônia",
                        source: "colab"
                    },
                    geometry: {
                        type: "Point",
                        coordinates: [-55, -10]
                    }
                }
            ]
        };
    }
    
    /**
     * Método para você exportar dados do Colab facilmente
     * Cole este código no seu Colab:
     */
    static getColabExportCode() {
        return `
# CÓDIGO PARA ADICIONAR AO SEU COLAB:
# ----------------------------------------------------
# Exportar dados como GeoJSON

import json
import geopandas as gpd
from google.colab import files

def export_to_geojson(gdf, filename):
    """Exporta GeoDataFrame para GeoJSON"""
    # Converter para GeoJSON
    geojson = gdf.to_json()
    
    # Salvar arquivo
    with open(f'{filename}.geojson', 'w') as f:
        json.dump(json.loads(geojson), f)
    
    # Download
    files.download(f'{filename}.geojson')
    
    print(f"✅ Arquivo {filename}.geojson exportado com sucesso!")
    return geojson

# Exemplo de uso:
# gdf = gpd.read_file('seu_shapefile.shp')
# export_to_geojson(gdf, 'meus_dados')

# ----------------------------------------------------
# Para exportar dados de análise:

def export_analysis_results(results_dict, base_name='analise'):
    """Exporta múltiplos resultados"""
    exports = {}
    
    for name, data in results_dict.items():
        if hasattr(data, 'to_json'):  # É GeoDataFrame
            exports[name] = export_to_geojson(data, f'{base_name}_{name}')
        elif isinstance(data, dict):  # É dicionário
            with open(f'{base_name}_{name}.json', 'w') as f:
                json.dump(data, f)
            files.download(f'{base_name}_{name}.json')
    
    return exports
        `;
    }
}