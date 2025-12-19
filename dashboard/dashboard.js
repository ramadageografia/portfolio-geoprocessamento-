// dashboard/js/dashboard.js
class GeoDashboard {
    constructor(config) {
        this.config = {
            dataUrl: config.dataUrl || 'data/festivais_mundiais.geojson',
            mapContainer: config.mapContainer || 'map',
            enableClustering: config.enableClustering !== false,
            enableHeatmap: config.enableHeatmap !== false,
            defaultView: config.defaultView || 'map'
        };
        
        this.map = null;
        this.data = null;
        this.markers = [];
        this.currentFilters = {
            continent: 'all',
            size: 'all',
            search: ''
        };
        
        this.init();
    }
    
    async init() {
        await this.loadData();
        this.initMap();
        this.setupUI();
        this.setupEventListeners();
        this.updateDashboard();
    }
    
    async loadData() {
        try {
            const response = await fetch(this.config.dataUrl);
            this.data = await response.json();
            console.log('Dados carregados:', this.data.features.length, 'festivais');
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.showError('Não foi possível carregar os dados.');
        }
    }
    
    initMap() {
        // Inicializar mapa
        this.map = L.map(this.config.mapContainer).setView([20, 0], 2);
        
        // Tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19
        }).addTo(this.map);
        
        // Clustering
        if (this.config.enableClustering) {
            this.markerCluster = L.markerClusterGroup({
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                spiderfyOnMaxZoom: true,
                disableClusteringAtZoom: 15
            });
            this.map.addLayer(this.markerCluster);
        }
        
        // Adicionar marcadores
        this.addMarkers();
    }
    
    addMarkers() {
        if (!this.data) return;
        
        // Limpar marcadores existentes
        if (this.config.enableClustering) {
            this.markerCluster.clearLayers();
        } else {
            this.markers.forEach(marker => this.map.removeLayer(marker));
            this.markers = [];
        }
        
        // Filtrar dados
        const filteredFeatures = this.filterData();
        
        // Adicionar novos marcadores
        filteredFeatures.forEach(feature => {
            const marker = this.createMarker(feature);
            
            if (this.config.enableClustering) {
                this.markerCluster.addLayer(marker);
            } else {
                marker.addTo(this.map);
                this.markers.push(marker);
            }
        });
        
        // Ajustar zoom se necessário
        if (filteredFeatures.length > 0 && !this.config.enableClustering) {
            const bounds = L.latLngBounds(filteredFeatures.map(f => 
                [f.geometry.coordinates[1], f.geometry.coordinates[0]]
            ));
            this.map.fitBounds(bounds, { padding: [50, 50] });
        }
    }
    
    createMarker(feature) {
        const size = this.getMarkerSize(feature.properties.attendance_numeric);
        const color = feature.properties.color || '#2E7D32';
        
        const marker = L.circleMarker(
            [feature.geometry.coordinates[1], feature.geometry.coordinates[0]],
            {
                radius: size,
                fillColor: color,
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.7
            }
        );
        
        // Tooltip
        marker.bindTooltip(feature.properties.name, {
            direction: 'top',
            offset: [0, -10],
            opacity: 0.9
        });
        
        // Popup
        marker.bindPopup(this.createPopupContent(feature));
        
        return marker;
    }
    
    getMarkerSize(attendance) {
        if (!attendance) return 8;
        if (attendance >= 20000) return 20;
        if (attendance >= 5000) return 14;
        if (attendance >= 1000) return 10;
        return 8;
    }
    
    createPopupContent(feature) {
        const props = feature.properties;
        return `
            <div class="popup-content">
                <h3>${props.name}</h3>
                <div class="popup-details">
                    <p><strong>País:</strong> ${props.country}</p>
                    <p><strong>Continente:</strong> ${props.continent}</p>
                    <p><strong>Público:</strong> ${props.attendance}</p>
                    <p><strong>Categoria:</strong> ${props.size}</p>
                    ${props.genres ? `<p><strong>Estilos:</strong> ${props.genres}</p>` : ''}
                </div>
                <div class="popup-actions">
                    <button class="popup-btn" onclick="dashboard.zoomToMarker(${feature.geometry.coordinates[1]}, ${feature.geometry.coordinates[0]})">
                        <i class="fas fa-search-plus"></i> Zoom
                    </button>
                    <button class="popup-btn" onclick="dashboard.highlightFestival('${props.name}')">
                        <i class="fas fa-star"></i> Destacar
                    </button>
                </div>
            </div>
        `;
    }
    
    filterData() {
        if (!this.data) return [];
        
        return this.data.features.filter(feature => {
            const props = feature.properties;
            
            // Filtro por continente
            if (this.currentFilters.continent !== 'all' && 
                this.currentFilters.continent !== props.continent) {
                return false;
            }
            
            // Filtro por tamanho
            if (this.currentFilters.size !== 'all') {
                const sizeMap = {
                    'grande': 'Grande (20k+)',
                    'medio': 'Médio (5k-20k)',
                    'pequeno': 'Pequeno (<5k)'
                };
                if (props.size !== sizeMap[this.currentFilters.size]) {
                    return false;
                }
            }
            
            // Filtro por busca
            if (this.currentFilters.search) {
                const searchTerm = this.currentFilters.search.toLowerCase();
                const searchable = [
                    props.name,
                    props.country,
                    props.continent,
                    props.genres
                ].join(' ').toLowerCase();
                
                if (!searchable.includes(searchTerm)) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    setupUI() {
        // Preencher filtros de continente
        this.setupContinentFilters();
        
        // Atualizar estatísticas
        this.updateStatistics();
        
        // Configurar legenda
        this.setupLegend();
    }
    
    setupContinentFilters() {
        if (!this.data) return;
        
        const continents = [...new Set(this.data.features.map(f => f.properties.continent))];
        const container = document.getElementById('continentFilter');
        
        continents.forEach(continent => {
            const option = document.createElement('label');
            option.className = 'filter-option';
            option.innerHTML = `
                <input type="checkbox" data-continent="${continent}">
                <span class="checkmark"></span>
                ${continent}
            `;
            
            option.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.currentFilters.continent = continent;
                } else {
                    this.currentFilters.continent = 'all';
                }
                this.updateDashboard();
            });
            
            container.appendChild(option);
        });
    }
    
    updateStatistics() {
        if (!this.data) return;
        
        const features = this.filterData();
        const total = features.length;
        const continents = new Set(features.map(f => f.properties.continent)).size;
        const avgAttendance = features.reduce((sum, f) => 
            sum + (f.properties.attendance_numeric || 0), 0) / total || 0;
        
        // Atualizar UI
        document.getElementById('totalFestivals').textContent = total;
        document.getElementById('totalContinents').textContent = continents;
        document.getElementById('avgAttendance').textContent = 
            Math.round(avgAttendance).toLocaleString();
        
        // Atualizar insights
        this.updateInsights();
    }
    
    updateInsights() {
        if (!this.data) return;
        
        const features = this.filterData();
        
        // Continente com mais festivais
        const continentCount = features.reduce((acc, f) => {
            acc[f.properties.continent] = (acc[f.properties.continent] || 0) + 1;
            return acc;
        }, {});
        
        const topContinent = Object.entries(continentCount)
            .sort((a, b) => b[1] - a[1])[0];
        
        // Festival com maior público
        const largestFestival = features.reduce((max, f) => 
            (f.properties.attendance_numeric || 0) > (max.properties.attendance_numeric || 0) ? f : max
        , features[0]);
        
        // Atualizar elementos
        if (topContinent) {
            document.getElementById('topContinent').textContent = 
                `${topContinent[0]} (${topContinent[1]} festivais)`;
        }
        
        if (largestFestival) {
            document.getElementById('largestFestival').textContent = 
                `${largestFestival.properties.name}: ${largestFestival.properties.attendance}`;
        }
    }
    
    setupLegend() {
        const legendContainer = document.getElementById('legendContainer');
        const colors = {
            'Europa': '#2E7D32',
            'América do Norte': '#1565C0',
            'América do Sul': '#D84315',
            'América Central': '#FF8F00',
            'África': '#7B1FA2',
            'Ásia': '#00838F'
        };
        
        Object.entries(colors).forEach(([continent, color]) => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <div class="legend-color" style="background: ${color}"></div>
                <span>${continent}</span>
            `;
            legendContainer.appendChild(item);
        });
    }
    
    setupEventListeners() {
        // Filtros
        document.getElementById('clearFilters').addEventListener('click', () => {
            this.clearFilters();
        });
        
        // Busca na tabela
        document.getElementById('tableSearch').addEventListener('input', (e) => {
            this.currentFilters.search = e.target.value;
            this.updateDashboard();
        });
        
        // Controles do mapa
        document.getElementById('zoomIn').addEventListener('click', () => {
            this.map.zoomIn();
        });
        
        document.getElementById('zoomOut').addEventListener('click', () => {
            this.map.zoomOut();
        });
        
        document.getElementById('fitBounds').addEventListener('click', () => {
            const features = this.filterData();
            if (features.length > 0) {
                const bounds = L.latLngBounds(features.map(f => 
                    [f.geometry.coordinates[1], f.geometry.coordinates[0]]
                ));
                this.map.fitBounds(bounds, { padding: [50, 50] });
            }
        });
        
        // Alternar views
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });
    }
    
    clearFilters() {
        this.currentFilters = {
            continent: 'all',
            size: 'all',
            search: ''
        };
        
        // Resetar checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = cb.dataset.continent === 'all' || cb.dataset.size === 'all';
        });
        
        // Limpar busca
        document.getElementById('tableSearch').value = '';
        
        this.updateDashboard();
    }
    
    switchView(view) {
        // Remover classe active de todas as views
        document.querySelectorAll('.view-content').forEach(el => {
            el.classList.remove('active');
        });
        
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Ativar view selecionada
        document.getElementById(`${view}View`).classList.add('active');
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
    }
    
    updateDashboard() {
        this.addMarkers();
        this.updateStatistics();
        this.updateTable();
    }
    
    updateTable() {
        const features = this.filterData();
        const tbody = document.getElementById('tableBody');
        
        // Limpar tabela
        tbody.innerHTML = '';
        
        // Adicionar linhas
        features.forEach(feature => {
            const row = document.createElement('tr');
            const props = feature.properties;
            
            row.innerHTML = `
                <td>
                    <strong>${props.name}</strong>
                </td>
                <td>${props.country}</td>
                <td>
                    <span class="continent-badge" style="background: ${props.color}">
                        ${props.continent}
                    </span>
                </td>
                <td>${props.attendance}</td>
                <td>${props.size}</td>
                <td>
                    <button class="table-action" onclick="dashboard.zoomToMarker(${feature.geometry.coordinates[1]}, ${feature.geometry.coordinates[0]})">
                        <i class="fas fa-map-marker-alt"></i>
                    </button>
                    <button class="table-action" onclick="dashboard.showDetails('${props.name}')">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    zoomToMarker(lat, lng) {
        this.map.setView([lat, lng], 12);
        
        // Abrir popup se houver marcador
        this.markers.forEach(marker => {
            const markerLatLng = marker.getLatLng();
            if (markerLatLng.lat === lat && markerLatLng.lng === lng) {
                marker.openPopup();
            }
        });
    }
    
    highlightFestival(name) {
        // Implementar destaque visual
        console.log('Destacando festival:', name);
    }
    
    showDetails(name) {
        // Implementar modal de detalhes
        console.log('Mostrando detalhes de:', name);
    }
    
    showError(message) {
        // Implementar sistema de erros
        console.error('Erro:', message);
    }
}

// Inicializar globalmente para acesso via popups
window.dashboard = null;

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new GeoDashboard({
        dataUrl: 'data/festivais_mundiais.geojson',
        mapContainer: 'map'
    });
});
