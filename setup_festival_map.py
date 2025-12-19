#!/usr/bin/env python3
"""
SCRIPT DE INSTALAÇÃO AUTOMÁTICA - MAPA DE FESTIVAIS
Autor: Portfólio de Geoprocessamento
Data: 2024
Descrição: Processa dados de festivais e gera mapa interativo para o portfólio
"""

import pandas as pd
import json
import os
import sys
from pathlib import Path

def criar_estrutura_pastas():
    """Cria a estrutura de pastas do projeto"""
    pastas = [
        'data/raw',
        'data/processed',
        'assets/maps',
        'templates',
        'projetos/festivais-mundiais'
    ]
    
    for pasta in pastas:
        Path(pasta).mkdir(parents=True, exist_ok=True)
        print(f"✓ Pasta criada: {pasta}")
    
    return True

def processar_dados_csv(caminho_csv):
    """Processa o CSV e converte para GeoJSON"""
    try:
        # Ler o arquivo CSV
        df = pd.read_csv(caminho_csv)
        print(f"✓ CSV carregado: {len(df)} festivais encontrados")
        
        # Limpar e preparar dados
        df_limpo = limpar_dados(df)
        
        # Converter para GeoJSON
        geojson = converter_para_geojson(df_limpo)
        
        # Salvar GeoJSON processado
        caminho_geojson = 'data/processed/festivais_mundiais.geojson'
        with open(caminho_geojson, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, indent=2, ensure_ascii=False)
        
        print(f"✓ GeoJSON salvo: {caminho_geojson}")
        
        # Gerar estatísticas
        estatisticas = gerar_estatisticas(df_limpo)
        
        return df_limpo, geojson, estatisticas
        
    except Exception as e:
        print(f"✗ Erro ao processar CSV: {e}")
        return None, None, None

def limpar_dados(df):
    """Limpa e padroniza os dados"""
    # Criar cópia do dataframe
    df_clean = df.copy()
    
    # Renomear colunas para padrão em inglês
    df_clean.columns = [
        'festival_name', 'country', 'continent', 'coordinates',
        'music_genres', 'avg_attendance', 'ticket_price'
    ]
    
    # Processar coordenadas (separar lat e lon)
    df_clean[['latitude', 'longitude']] = df_clean['coordinates'].str.split(',', expand=True)
    df_clean['latitude'] = df_clean['latitude'].str.strip().astype(float)
    df_clean['longitude'] = df_clean['longitude'].str.strip().astype(float)
    
    # Processar público médio (extrair números)
    def extrair_publico(texto):
        if pd.isna(texto):
            return None
        # Extrair números do texto
        import re
        numeros = re.findall(r'\d+\.?\d*', str(texto))
        if numeros:
            if len(numeros) > 1:
                return (float(numeros[0]) + float(numeros[1])) / 2
            return float(numeros[0])
        return None
    
    df_clean['attendance_numeric'] = df_clean['avg_attendance'].apply(extrair_publico)
    
    # Classificar por tamanho do festival
    def classificar_tamanho(publico):
        if pd.isna(publico):
            return 'Desconhecido'
        if publico >= 20000:
            return 'Grande (20k+)'
        elif publico >= 5000:
            return 'Médio (5k-20k)'
        else:
            return 'Pequeno (<5k)'
    
    df_clean['size_category'] = df_clean['attendance_numeric'].apply(classificar_tamanho)
    
    # Cores por continente
    cores_continente = {
        'Europa': '#2E7D32',      # Verde
        'América do Norte': '#1565C0', # Azul
        'América do Sul': '#D84315',   # Laranja
        'América Central': '#FF8F00',  # Amarelo
        'África': '#7B1FA2',      # Roxo
        'Ásia': '#00838F',        # Ciano
    }
    
    df_clean['color'] = df_clean['continent'].map(cores_continente)
    
    print("✓ Dados limpos e processados")
    return df_clean

def converter_para_geojson(df):
    """Converte DataFrame para formato GeoJSON"""
    features = []
    
    for _, row in df.iterrows():
        if pd.notna(row['latitude']) and pd.notna(row['longitude']):
            feature = {
                "type": "Feature",
                "properties": {
                    "name": row['festival_name'],
                    "country": row['country'],
                    "continent": row['continent'],
                    "genres": row['music_genres'] if pd.notna(row['music_genres']) else "Multigênero",
                    "attendance": row['avg_attendance'] if pd.notna(row['avg_attendance']) else "Não informado",
                    "attendance_numeric": row['attendance_numeric'],
                    "size": row['size_category'],
                    "color": row['color'],
                    "popupContent": f"""
                    <div class="festival-popup">
                        <h3>{row['festival_name']}</h3>
                        <p><strong>País:</strong> {row['country']}</p>
                        <p><strong>Continente:</strong> {row['continent']}</p>
                        <p><strong>Estilo Musical:</strong> {row['music_genres'] if pd.notna(row['music_genres']) else 'Multigênero'}</p>
                        <p><strong>Público Médio:</strong> {row['avg_attendance'] if pd.notna(row['avg_attendance']) else 'Não informado'}</p>
                        <p><strong>Categoria:</strong> {row['size_category']}</p>
                    </div>
                    """
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [row['longitude'], row['latitude']]
                }
            }
            features.append(feature)
    
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    
    return geojson

def gerar_estatisticas(df):
    """Gera estatísticas dos dados"""
    estatisticas = {
        "total_festivais": len(df),
        "por_continente": df['continent'].value_counts().to_dict(),
        "por_categoria": df['size_category'].value_counts().to_dict(),
        "top_paises": df['country'].value_counts().head(5).to_dict(),
        "publico_total_estimado": df['attendance_numeric'].sum(),
        "publico_medio": df['attendance_numeric'].mean()
    }
    
    # Salvar estatísticas
    with open('data/processed/estatisticas_festivais.json', 'w', encoding='utf-8') as f:
        json.dump(estatisticas, f, indent=2, ensure_ascii=False)
    
    print("✓ Estatísticas geradas e salvas")
    return estatisticas

def criar_mapa_interativo(geojson, estatisticas):
    """Cria o arquivo HTML do mapa interativo"""
    template = f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mapa de Festivais de Música Eletrônica - Portfólio Geo</title>
    
    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root {{
            --primary-color: #2E7D32;
            --secondary-color: #1565C0;
            --accent-color: #FF8F00;
        }}
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Inter', 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #0a1929 0%, #1a237e 100%);
            color: white;
            min-height: 100vh;
        }}
        
        .dashboard-container {{
            display: grid;
            grid-template-columns: 300px 1fr;
            height: 100vh;
        }}
        
        /* Sidebar */
        .sidebar {{
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 30px;
            overflow-y: auto;
            border-right: 1px solid rgba(255, 255, 255, 0.2);
        }}
        
        .logo {{
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 40px;
        }}
        
        .logo-icon {{
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
        }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 30px 0;
        }}
        
        .stat-card {{
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 15px;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }}
        
        .stat-value {{
            font-size: 1.8rem;
            font-weight: bold;
            color: var(--accent-color);
        }}
        
        /* Filtros */
        .filter-group {{
            margin: 25px 0;
            padding: 20px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
        }}
        
        .filter-title {{
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
            font-size: 1.1rem;
        }}
        
        .filter-options {{
            display: flex;
            flex-direction: column;
            gap: 10px;
        }}
        
        .filter-option {{
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.3s;
        }}
        
        .filter-option:hover {{
            background: rgba(255, 255, 255, 0.1);
        }}
        
        .filter-option.active {{
            background: rgba(46, 125, 50, 0.3);
        }}
        
        /* Mapa */
        .map-container {{
            position: relative;
        }}
        
        #map {{
            height: 100vh;
            width: 100%;
        }}
        
        /* Legenda */
        .legend {{
            position: absolute;
            bottom: 30px;
            right: 30px;
            background: rgba(0, 0, 0, 0.8);
            padding: 20px;
            border-radius: 10px;
            z-index: 1000;
            min-width: 200px;
            backdrop-filter: blur(10px);
        }}
        
        .legend-item {{
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 8px 0;
        }}
        
        .legend-color {{
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid white;
        }}
        
        /* Popup personalizado */
        .festival-popup h3 {{
            color: var(--primary-color);
            margin-bottom: 10px;
        }}
        
        .festival-popup p {{
            margin: 5px 0;
            color: #333;
        }}
        
        /* Responsivo */
        @media (max-width: 1024px) {{
            .dashboard-container {{
                grid-template-columns: 1fr;
            }}
            .sidebar {{
                display: none;
            }}
        }}
    </style>
</head>
<body>
    <div class="dashboard-container">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="logo">
                <div class="logo-icon">
                    <i class="fas fa-globe-americas"></i>
                </div>
                <h2>Festivais Mundiais</h2>
            </div>
            
            <div class="project-info">
                <h3><i class="fas fa-info-circle"></i> Sobre o Projeto</h3>
                <p>Mapa interativo de festivais de música eletrônica ao redor do mundo. Dados processados com Python e visualizados com Leaflet.js.</p>
            </div>
            
            <!-- Estatísticas -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">{estatisticas['total_festivais']}</div>
                    <div class="stat-label">Festivais</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{len(estatisticas['por_continente'])}</div>
                    <div class="stat-label">Continentes</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{int(estatisticas['publico_total_estimado']):,}</div>
                    <div class="stat-label">Público Estimado</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{int(estatisticas['publico_media']):,}</div>
                    <div class="stat-label">Média por Festival</div>
                </div>
            </div>
            
            <!-- Filtros -->
            <div class="filter-group">
                <h4 class="filter-title"><i class="fas fa-filter"></i> Filtrar por Continente</h4>
                <div class="filter-options" id="continentFilters">
                    <div class="filter-option active" data-continent="all">
                        <i class="fas fa-check-circle"></i> Todos os Continentes
                    </div>
                    <!-- Filtros serão adicionados dinamicamente -->
                </div>
            </div>
            
            <div class="filter-group">
                <h4 class="filter-title"><i class="fas fa-chart-pie"></i> Distribuição</h4>
                <div id="continentChart">
                    <!-- Gráfico será adicionado dinamicamente -->
                </div>
            </div>
            
            <div class="data-source">
                <h4><i class="fas fa-database"></i> Fonte de Dados</h4>
                <p>Dataset original: DATA-TRANCE - Festivais Mundiais</p>
                <p>Processado em: {pd.Timestamp.now().strftime('%d/%m/%Y')}</p>
            </div>
        </aside>
        
        <!-- Mapa -->
        <main class="map-container">
            <div id="map"></div>
            
            <!-- Legenda -->
            <div class="legend">
                <h4><i class="fas fa-palette"></i> Legenda</h4>
                <div id="legendContent">
                    <!-- Legenda será preenchida dinamicamente -->
                </div>
            </div>
        </main>
    </div>
    
    <!-- Leaflet JS -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    
    <!-- Chart.js para gráficos -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <script>
        // Dados dos festivais
        const festivalData = {json.dumps(geojson, ensure_ascii=False)};
        
        // Inicializar mapa
        const map = L.map('map').setView([20, 0], 2);
        
        // Adicionar tile layer
        L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
            attribution: '© OpenStreetMap'
        }}).addTo(map);
        
        // Grupo para os marcadores
        const festivalMarkers = L.layerGroup().addTo(map);
        
        // Cores por continente
        const continentColors = {{
            'Europa': '#2E7D32',
            'América do Norte': '#1565C0',
            'América do Sul': '#D84315',
            'América Central': '#FF8F00',
            'África': '#7B1FA2',
            'Ásia': '#00838F'
        }};
        
        // Adicionar marcadores ao mapa
        function addMarkers(filterContinent = 'all') {{
            // Limpar marcadores existentes
            festivalMarkers.clearLayers();
            
            festivalData.features.forEach(feature => {{
                if (filterContinent === 'all' || feature.properties.continent === filterContinent) {{
                    const popupContent = feature.properties.popupContent;
                    
                    // Criar marcador com ícone personalizado
                    const marker = L.circleMarker(
                        [feature.geometry.coordinates[1], feature.geometry.coordinates[0]],
                        {{
                            radius: getMarkerSize(feature.properties.attendance_numeric),
                            fillColor: feature.properties.color,
                            color: '#fff',
                            weight: 2,
                            opacity: 1,
                            fillOpacity: 0.7
                        }}
                    ).bindPopup(popupContent);
                    
                    marker.addTo(festivalMarkers);
                }}
            }});
        }}
        
        // Tamanho do marcador baseado no público
        function getMarkerSize(attendance) {{
            if (!attendance) return 8;
            if (attendance >= 20000) return 20;
            if (attendance >= 5000) return 15;
            return 10;
        }}
        
        // Inicializar com todos os marcadores
        addMarkers();
        
        // Configurar filtros
        function setupFilters() {{
            const continents = [...new Set(festivalData.features.map(f => f.properties.continent))];
            const filterContainer = document.getElementById('continentFilters');
            
            continents.forEach(continent => {{
                const filterOption = document.createElement('div');
                filterOption.className = 'filter-option';
                filterOption.dataset.continent = continent;
                filterOption.innerHTML = `
                    <i class="fas fa-circle" style="color: ${{continentColors[continent] || '#666'}}"></i>
                    ${{continent}}
                `;
                
                filterOption.addEventListener('click', function() {{
                    // Ativar filtro
                    document.querySelectorAll('.filter-option').forEach(opt => {{
                        opt.classList.remove('active');
                    }});
                    this.classList.add('active');
                    
                    // Aplicar filtro
                    addMarkers(this.dataset.continent);
                }});
                
                filterContainer.appendChild(filterOption);
            }});
        }}
        
        // Configurar legenda
        function setupLegend() {{
            const legendContent = document.getElementById('legendContent');
            legendContent.innerHTML = '';
            
            Object.entries(continentColors).forEach(([continent, color]) => {{
                const legendItem = document.createElement('div');
                legendItem.className = 'legend-item';
                legendItem.innerHTML = `
                    <div class="legend-color" style="background: ${{color}}"></div>
                    <span>${{continent}}</span>
                `;
                legendContent.appendChild(legendItem);
            }});
        }}
        
        // Gráfico de distribuição
        function setupChart() {{
            const ctx = document.createElement('canvas');
            document.getElementById('continentChart').appendChild(ctx);
            
            const continentCounts = festivalData.features.reduce((acc, feature) => {{
                const continent = feature.properties.continent;
                acc[continent] = (acc[continent] || 0) + 1;
                return acc;
            }}, {{}});
            
            new Chart(ctx, {{
                type: 'doughnut',
                data: {{
                    labels: Object.keys(continentCounts),
                    datasets: [{{
                        data: Object.values(continentCounts),
                        backgroundColor: Object.keys(continentCounts).map(c => continentColors[c] || '#999')
                    }}]
                }},
                options: {{
                    responsive: true,
                    plugins: {{
                        legend: {{ display: false }}
                    }}
                }}
            }});
        }}
        
        // Inicializar tudo quando a página carregar
        document.addEventListener('DOMContentLoaded', function() {{
            setupFilters();
            setupLegend();
            setupChart();
        }});
    </script>
</body>
</html>
"""
    
    # Salvar o arquivo HTML
    caminho_html = 'projetos/festivais-mundiais/index.html'
    with open(caminho_html, 'w', encoding='utf-8') as f:
        f.write(template)
    
    print(f"✓ Mapa interativo criado: {caminho_html}")
    return caminho_html

def criar_pagina_projeto():
    """Cria a página de projeto detalhado para o portfólio"""
    template = """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Festivais Mundiais - Análise Geoespacial | Portfólio</title>
    <!-- Incluir os mesmos estilos do seu portfólio principal -->
</head>
<body>
    <section class="project-detail">
        <h1>Análise Geoespacial de Festivais de Música Eletrônica</h1>
        <div class="project-meta">
            <span><i class="fas fa-calendar"></i> Concluído: 2024</span>
            <span><i class="fas fa-tags"></i> Tags: Web GIS, Data Visualization, Python</span>
            <span><i class="fas fa-database"></i> Fontes: DATA-TRANCE Dataset</span>
        </div>
        
        <div class="project-content">
            <h2>Mapa Interativo</h2>
            <div class="map-embed">
                <!-- Embed do mapa que criamos -->
                <iframe src="../projetos/festivais-mundiais/index.html" 
                        width="100%" height="600" style="border: 1px solid #ddd; border-radius: 10px;">
                </iframe>
            </div>
            
            <h2>Metodologia</h2>
            <p>Processamento de dados CSV, geocodificação, análise espacial e visualização interativa.</p>
            
            <h2>Tecnologias Utilizadas</h2>
            <div class="tech-stack">
                <span class="tech-badge">Python</span>
                <span class="tech-badge">Pandas</span>
                <span class="tech-badge">GeoJSON</span>
                <span class="tech-badge">Leaflet.js</span>
                <span class="tech-badge">Chart.js</span>
            </div>
        </div>
    </section>
</body>
</html>
"""
    
    caminho_projeto = 'projetos/festivais-mundiais/projeto-detalhado.html'
    with open(caminho_projeto, 'w', encoding='utf-8') as f:
        f.write(template)
    
    print(f"✓ Página de projeto criada: {caminho_projeto}")
    return caminho_projeto

def criar_requirements():
    """Cria arquivo requirements.txt"""
    requirements = """pandas>=1.5.0
geopandas>=0.12.0
folium>=0.14.0
"""
    
    with open('requirements.txt', 'w') as f:
        f.write(requirements)
    
    print("✓ Arquivo requirements.txt criado")
    return True

def main():
    """Função principal do script"""
    print("=" * 60)
    print("SCRIPT DE INSTALAÇÃO - MAPA DE FESTIVAIS MUNDIAIS")
    print("=" * 60)
    
    # 1. Criar estrutura de pastas
    print("\n[1/5] Criando estrutura de pastas...")
    criar_estrutura_pastas()
    
    # 2. Baixar e processar dados (assumindo que o CSV já está baixado)
    print("\n[2/5] Processando dados do CSV...")
    
    # Verificar se o CSV existe
    caminho_csv = input("Digite o caminho do arquivo CSV (ou pressione Enter para usar o padrão): ").strip()
    if not caminho_csv:
        caminho_csv = 'data/raw/DATA-TRANCE - Folha1.csv'
        print(f"Usando caminho padrão: {caminho_csv}")
    
    if not os.path.exists(caminho_csv):
        print("✗ Arquivo CSV não encontrado.")
        print("Por favor, baixe o arquivo do Google Drive e salve como:")
        print(f"'{caminho_csv}'")
        return
    
    df, geojson, estatisticas = processar_dados_csv(caminho_csv)
    
    if df is None:
        print("✗ Falha no processamento dos dados.")
        return
    
    # 3. Criar mapa interativo
    print("\n[3/5] Criando mapa interativo...")
    caminho_mapa = criar_mapa_interativo(geojson, estatisticas)
    
    # 4. Criar página do projeto
    print("\n[4/5] Criando página do projeto...")
    caminho_projeto = criar_pagina_projeto()
    
    # 5. Criar requirements
    print("\n[5/5] Criando arquivo de dependências...")
    criar_requirements()
    
    print("\n" + "=" * 60)
    print("INSTALAÇÃO CONCLUÍDA COM SUCESSO! 🎉")
    print("=" * 60)
    
    print("\n📁 ESTRUTURA CRIADA:")
    print("├── data/raw/                    # Dados originais")
    print("├── data/processed/              # Dados processados")
    print("│   ├── festivais_mundiais.geojson")
    print("│   └── estatisticas_festivais.json")
    print("├── projetos/festivais-mundiais/ # Projeto completo")
    print("│   ├── index.html               # Mapa interativo")
    print("│   └── projeto-detalhado.html   # Página do portfólio")
    print("├── templates/                   # Templates reutilizáveis")
    print("└── requirements.txt             # Dependências Python")
    
    print("\n🚀 PRÓXIMOS PASSOS:")
    print("1. Instale as dependências: pip install -r requirements.txt")
    print(f"2. Abra o mapa interativo: projetos/festivais-mundiais/index.html")
    print(f"3. Integre ao seu portfólio: projetos/festivais-mundiais/projeto-detalhado.html")
    print("4. Personalize as cores e estilos no código HTML")
    
    print("\n🌍 ESTATÍSTICAS DO SEU DATASET:")
    print(f"   • Total de festivais: {estatisticas['total_festivais']}")
    print(f"   • Continentes cobertos: {', '.join(estatisticas['por_continente'].keys())}")
    print(f"   • Público total estimado: {estatisticas['publico_total_estimado']:,.0f} pessoas")
    print(f"   • Maior concentração: {max(estatisticas['por_continente'], key=estatisticas['por_continente'].get)}")

if __name__ == "__main__":
    main()
