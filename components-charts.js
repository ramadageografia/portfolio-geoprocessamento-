// components/charts.js - Gráficos do Dashboard

class DashboardCharts {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.charts = {};
    }
    
    init() {
        this.initDistributionChart();
        this.initTimelineChart();
        this.initRegionChart();
        this.initDensityChart();
    }
    
    update() {
        this.updateDistributionChart();
        this.updateTimelineChart();
        this.updateRegionChart();
        this.updateDensityChart();
    }
    
    initDistributionChart() {
        const ctx = document.getElementById('chartDistribution').getContext('2d');
        
        this.charts.distribution = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#2E7D32', '#4CAF50', '#81C784', '#A5D6A7',
                        '#C8E6C9', '#1B5E20', '#388E3C', '#66BB6A'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    updateDistributionChart() {
        if (!this.dashboard.filteredData) return;
        
        const features = this.dashboard.filteredData.features;
        const typeCounts = {};
        
        features.forEach(feature => {
            const type = feature.properties.type || 'unknown';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        
        const labels = Object.keys(typeCounts);
        const data = Object.values(typeCounts);
        
        this.charts.distribution.data.labels = labels;
        this.charts.distribution.data.datasets[0].data = data;
        this.charts.distribution.update();
    }
    
    initTimelineChart() {
        const ctx = document.getElementById('chartTimeline').getContext('2d');
        
        this.charts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Ocorrências por Mês',
                    data: [],
                    borderColor: '#2E7D32',
                    backgroundColor: 'rgba(46, 125, 50, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantidade'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Período'
                        }
                    }
                }
            }
        });
    }
    
    updateTimelineChart() {
        if (!this.dashboard.filteredData) return;
        
        const features = this.dashboard.filteredData.features;
        const monthlyCounts = {};
        
        features.forEach(feature => {
            if (feature.properties.date) {
                const date = new Date(feature.properties.date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
            }
        });
        
        // Ordenar meses
        const months = Object.keys(monthlyCounts).sort();
        const counts = months.map(month => monthlyCounts[month]);
        
        this.charts.timeline.data.labels = months;
        this.charts.timeline.data.datasets[0].data = counts;
        this.charts.timeline.update();
    }
    
    initRegionChart() {
        const ctx = document.getElementById('chartByRegion').getContext('2d');
        
        this.charts.region = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Valor Médio',
                    data: [],
                    backgroundColor: '#4CAF50',
                    borderColor: '#2E7D32',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Valor'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Média: ${context.raw.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    updateRegionChart() {
        if (!this.dashboard.filteredData) return;
        
        const features = this.dashboard.filteredData.features;
        const regionData = {};
        
        features.forEach(feature => {
            const region = feature.properties.region || 'Não especificado';
            const value = feature.properties.value || 0;
            
            if (!regionData[region]) {
                regionData[region] = {
                    sum: 0,
                    count: 0
                };
            }
            
            regionData[region].sum += value;
            regionData[region].count += 1;
        });
        
        // Calcular médias
        const regions = Object.keys(regionData);
        const averages = regions.map(region => 
            regionData[region].sum / regionData[region].count
        );
        
        this.charts.region.data.labels = regions;
        this.charts.region.data.datasets[0].data = averages;
        this.charts.region.update();
    }
    
    initDensityChart() {
        const ctx = document.getElementById('chartDensity').getContext('2d');
        
        this.charts.density = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Manhã', 'Tarde', 'Noite', 'Madrugada'],
                datasets: [{
                    label: 'Densidade por Período',
                    data: [0, 0, 0, 0],
                    backgroundColor: 'rgba(76, 175, 80, 0.2)',
                    borderColor: '#4CAF50',
                    borderWidth: 2,
                    pointBackgroundColor: '#2E7D32'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 5
                        }
                    }
                }
            }
        });
    }
    
    updateDensityChart() {
        if (!this.dashboard.filteredData) return;
        
        // Simulação de dados por período do dia
        const periodCounts = [0, 0, 0, 0];
        
        this.dashboard.filteredData.features.forEach(feature => {
            if (feature.properties.timestamp) {
                const hour = new Date(feature.properties.timestamp).getHours();
                if (hour >= 6 && hour < 12) periodCounts[0]++; // Manhã
                else if (hour >= 12 && hour < 18) periodCounts[1]++; // Tarde
                else if (hour >= 18 && hour < 24) periodCounts[2]++; // Noite
                else periodCounts[3]++; // Madrugada
            }
        });
        
        this.charts.density.data.datasets[0].data = periodCounts;
        this.charts.density.update();
    }
}

// Adicionar métodos ao dashboard
GeoDashboard.prototype.initCharts = function() {
    this.chartManager = new DashboardCharts(this);
    this.chartManager.init();
};

GeoDashboard.prototype.updateCharts = function() {
    if (this.chartManager) {
        this.chartManager.update();
    }
};