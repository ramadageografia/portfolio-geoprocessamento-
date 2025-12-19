// dashboard-integrado.js - Dashboard com seus dados reais

class IntegratedGeoDashboard extends GeoDashboard {
    constructor() {
        super();
        this.colabIntegration = new ColabIntegration(CONFIG);
        this.myMapsIntegration = new MyMapsIntegration(CONFIG);
        this.mergedData = null;
    }
    
    async init() {
        // 1. Carregar configuração
        this.loadConfig();
        
        // 2. Inicializar mapa
        this.initMap();
        
        // 3. Carregar dados das fontes
        await this.loadAllData();
        
        // 4. Inicializar componentes
        this.initUI();
        this.initStats();
        this.initCharts();
        this.initTable();
        this.initLayerControls();
        this.initLegend();
        
        // 5. Atualizar display
        this.updateDisplay();
        
        // 6. Mostrar informações das fontes
        this.showDataSources();
    }
    
    async loadAllData() {
        // Mostrar loading
        this.showLoading(true, "Carregando seus dados do Colab e My Maps...");
        
        try {
            // Carregar dados do Colab
            const colabData = await this.colabIntegration.fetchColabData('gist');
            
            // Carregar dados do My Maps
            const myMapsData = await this.myMapsIntegration.loadMyMapsData();
            
            // Mesclar dados
            this.mergedData = this.mergeDataSources(colabData, myMapsData);
            
            // Atualizar dados do dashboard
            this.data = this.mergedData;
            this.filteredData = {...this.mergedData};
            
            console.log('Dados carregados:', {
                totalFeatures: this.data.features.length,
                fromColab: colabData.features?.length || 0,
                fromMyMaps: myMapsData.features?.length || 0
            });
            
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.showError('Erro ao carregar dados. Usando dados de exemplo.');
            
            // Usar dados de fallback
            this.data = this.getFallbackData();
            this.filteredData = {...this.data};
        } finally {
            this.showLoading(false);
        }
    }
    
    mergeDataSources(colabData, myMapsData) {
        const features = [];
        
        // Adicionar dados do Colab
        if (colabData && colabData.features) {
            features.push(...colabData.features.map(f => ({
                ...f,
                properties: {
                    ...f.properties,
                    source_type: 'colab',
                    icon: 'fas fa-code'
                }
            })));
        }
        
        // Adicionar dados do My Maps
        if (myMapsData && myMapsData.features) {
            features.push(...myMapsData.features.map(f => ({
                ...f,
                properties: {
                    ...f.properties,
                    source_type: 'my_maps',
                    icon: 'fas fa-map-marker-alt'
                }
            })));
        }
        
        return {
            type: "FeatureCollection",
            features: features
        };
    }
    
    initUI() {
        // Adicionar controles específicos para suas fontes
        this.addSourceControls();
        this.addProjectFilters();
    }
    
    addSourceControls() {
        const controls = `
            <div class="source-controls">
                <div class="btn-group">
                    <button class="btn btn-secondary" onclick="toggleSource('colab')">
                        <i class="fas fa-code"></i> Colab
                    </button>
                    <button class="btn btn-secondary" onclick="toggleSource('my_maps')">
                        <i class="fas fa-map-marked-alt"></i> My Maps
                    </button>
                    <button class="btn btn-secondary" onclick="toggleSource('all')">
                        <i class="fas fa-layer-group"></i> Todos
                    </button>
                </div>
                <div class="source-info">
                    <small>
                        <i class="fas fa-info-circle"></i>
                        Dados integrados do seu Colab e My Maps
                    </small>
                </div>
            </div>
        `;
        
        document.querySelector('.dashboard-controls').insertAdjacentHTML('beforeend', controls);
    }
    
    addProjectFilters() {
        // Adicionar filtro por área de especialização
        const areaFilter = `
            <div class="filter-item">
                <label for="filterArea"><i class="fas fa-layer-group"></i> Área de Especialização</label>
                <select id="filterArea" class="filter-select" multiple onchange="applyFilters()">
                    <option value="all" selected>Todas</option>
                    <option value="cartografia">Cartografia Digital</option>
                    <option value="sensoriamento">Sensoriamento Remoto</option>
                    <option value="webgis">Web GIS</option>
                </select>
            </div>
        `;
        
        document.querySelector('.filter-group').insertAdjacentHTML('afterbegin', areaFilter);
    }
    
    showDataSources() {
        // Criar painel de informações das fontes
        const infoPanel = `
            <div class="info-panel">
                <h4><i class="fas fa-database"></i> Fontes de Dados</h4>
                <div class="source-list">
                    <div class="source-item">
                        <i class="fab fa-google"></i>
                        <strong>Google Colab</strong>
                        <a href="${CONFIG.COLAB.NOTEBOOK_URL}" target="_blank">
                            Ver notebook
                        </a>
                    </div>
                    <div class="source-item">
                        <i class="fas fa-map"></i>
                        <strong>Google My Maps</strong>
                        <a href="${CONFIG.MY_MAPS.EMBED_URL}" target="_blank">
                            Ver mapa
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('sidebar').insertAdjacentHTML('beforeend', infoPanel);
    }
    
    getFallbackData() {
        // Dados de exemplo baseados nas suas áreas
        return {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    properties: {
                        name: "Análise NDVI - Amazônia",
                        value: 85,
                        type: "sensoriamento",
                        area: "sensoriamento",
                        source: "colab",
                        date: "2024-01-15",
                        description: "Análise de vegetação usando Sentinel-2"
                    },
                    geometry: {
                        type: "Point",
                        coordinates: [-55, -10]
                    }
                },
                {
                    type: "Feature",
                    properties: {
                        name: "Mapa de Uso do Solo - SP",
                        value: 92,
                        type: "cartografia",
                        area: "cartografia",
                        source: "colab",
                        date: "2024-02-20",
                        description: "Classificação supervisionada Landsat-8"
                    },
                    geometry: {
                        type: "Point",
                        coordinates: [-46.5, -23.5]
                    }
                },
                {
                    type: "Feature",
                    properties: {
                        name: "Dashboard Web GIS",
                        value: 88,
                        type: "webgis",
                        area: "webgis",
                        source: "my_maps",
                        date: "2024-03-10",
                        description: "Mapa interativo com Leaflet.js"
                    },
                    geometry: {
                        type: "Point",
                        coordinates: [-47.5, -15.5]
                    }
                }
            ]
        };
    }
    
    // Sobrescrever método de filtro para incluir área
    passesFilters(feature) {
        const props = feature.properties;
        
        // Filtro por área
        if (this.filters.area && !this.filters.area.includes('all')) {
            if (!this.filters.area.includes(props.area)) {
                return false;
            }
        }
        
        // Chamar filtro original
        return super.passesFilters(feature);
    }
    
    showLoading(show, message = "Carregando...") {
        const loader = document.getElementById('loadingOverlay') || this.createLoader();
        
        if (show) {
            loader.querySelector('.loading-message').textContent = message;
            loader.style.display = 'flex';
        } else {
            loader.style.display = 'none';
        }
    }
    
    createLoader() {
        const loader = document.createElement('div');
        loader.id = 'loadingOverlay';
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255,255,255,0.9);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            flex-direction: column;
        `;
        
        loader.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-message" style="margin-top: 20px; font-size: 16px;"></div>
        `;
        
        // Adicionar estilo do spinner
        const style = document.createElement('style');
        style.textContent = `
            .spinner {
                width: 50px;
                height: 50px;
                border: 5px solid #f3f3f3;
                border-top: 5px solid ${CONFIG.AREAS.cartografia.color};
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(loader);
        return loader;
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ffebee;
            color: #c62828;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #c62828;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        
        errorDiv.innerHTML = `
            <strong><i class="fas fa-exclamation-triangle"></i> Atenção</strong>
            <p>${message}</p>
            <button onclick="this.parentElement.remove()" style="
                background: none;
                border: none;
                color: #c62828;
                position: absolute;
                top: 5px;
                right: 5px;
                cursor: pointer;
            ">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Auto-remover após 10 segundos
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 10000);
    }
}

// Funções globais para os novos controles
function toggleSource(source) {
    if (dashboard && dashboard instanceof IntegratedGeoDashboard) {
        dashboard.filters.source = source === 'all' ? null : source;
        dashboard.applyFilters();
    }
}

// Inicializar dashboard integrado
function initializeIntegratedDashboard() {
    dashboard = new IntegratedGeoDashboard();
}