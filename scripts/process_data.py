#!/usr/bin/env python3
"""
PROCESSADOR DE DADOS - FESTIVAIS MUNDIAIS
Processa CSV e gera dados para o dashboard
"""

import pandas as pd
import json
import os
from pathlib import Path

def process_festivals_data():
    """Processa dados dos festivais para o dashboard"""
    
    print("🔄 Processando dados dos festivais...")
    
    # Criar estrutura de pastas
    Path("dashboard/data").mkdir(parents=True, exist_ok=True)
    
    try:
        # Carregar CSV (ajuste o caminho conforme necessário)
        df = pd.read_csv("DATA-TRANCE - Folha1.csv")
        
        # Processar dados
        processed_data = []
        
        for _, row in df.iterrows():
            festival = {
                "name": row["Nome do Festival"],
                "country": row["País"],
                "continent": row["Continente"],
                "coordinates": row["Coordenadas (Aproximadas)"],
                "genres": row["Vertentes"] if pd.notna(row["Vertentes"]) else "Multigênero",
                "attendance": row["Média de público"] if pd.notna(row["Média de público"]) else "Não informado",
                "ticket_price": row["Ingressos"] if pd.notna(row["Ingressos"]) else "Não informado"
            }
            
            # Processar coordenadas
            if pd.notna(festival["coordinates"]):
                try:
                    lat, lon = map(float, festival["coordinates"].split(","))
                    festival["latitude"] = lat
                    festival["longitude"] = lon
                except:
                    festival["latitude"] = None
                    festival["longitude"] = None
            
            # Calcular público numérico para categorização
            if pd.notna(row["Média de público"]):
                attendance_str = str(row["Média de público"])
                numbers = []
                for part in attendance_str.split():
                    if part.replace(",", "").replace(".", "").isdigit():
                        num = float(part.replace(",", ""))
                        numbers.append(num)
                
                if numbers:
                    festival["attendance_numeric"] = sum(numbers) / len(numbers)
                    
                    # Categorizar
                    if festival["attendance_numeric"] >= 20000:
                        festival["size_category"] = "Grande (20k+)"
                    elif festival["attendance_numeric"] >= 5000:
                        festival["size_category"] = "Médio (5k-20k)"
                    else:
                        festival["size_category"] = "Pequeno (<5k)"
                else:
                    festival["attendance_numeric"] = None
                    festival["size_category"] = "Desconhecido"
            else:
                festival["attendance_numeric"] = None
                festival["size_category"] = "Desconhecido"
            
            # Cor por continente
            continent_colors = {
                "Europa": "#2E7D32",
                "América do Norte": "#1565C0",
                "América do Sul": "#D84315",
                "América Central": "#FF8F00",
                "África": "#7B1FA2",
                "Ásia": "#00838F"
            }
            
            festival["color"] = continent_colors.get(festival["continent"], "#666666")
            
            processed_data.append(festival)
        
        # Converter para GeoJSON
        geojson = {
            "type": "FeatureCollection",
            "features": []
        }
        
        for festival in processed_data:
            if festival.get("latitude") and festival.get("longitude"):
                feature = {
                    "type": "Feature",
                    "properties": {
                        "name": festival["name"],
                        "country": festival["country"],
                        "continent": festival["continent"],
                        "genres": festival["genres"],
                        "attendance": festival["attendance"],
                        "attendance_numeric": festival["attendance_numeric"],
                        "size": festival["size_category"],
                        "color": festival["color"],
                        "ticket_price": festival["ticket_price"]
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [festival["longitude"], festival["latitude"]]
                    }
                }
                geojson["features"].append(feature)
        
        # Salvar GeoJSON
        with open("dashboard/data/festivais_mundiais.geojson", "w", encoding="utf-8") as f:
            json.dump(geojson, f, indent=2, ensure_ascii=False)
        
        # Gerar estatísticas
        stats = {
            "total_festivals": len(geojson["features"]),
            "by_continent": {},
            "by_size": {},
            "total_attendance": 0,
            "continents": []
        }
        
        # Contar por continente
        for feature in geojson["features"]:
            continent = feature["properties"]["continent"]
            stats["by_continent"][continent] = stats["by_continent"].get(continent, 0) + 1
            
            size = feature["properties"]["size"]
            stats["by_size"][size] = stats["by_size"].get(size, 0) + 1
            
            if feature["properties"]["attendance_numeric"]:
                stats["total_attendance"] += feature["properties"]["attendance_numeric"]
        
        stats["continents"] = list(stats["by_continent"].keys())
        stats["average_attendance"] = stats["total_attendance"] / len(geojson["features"]) if geojson["features"] else 0
        
        # Salvar estatísticas
        with open("dashboard/data/estatisticas.json", "w", encoding="utf-8") as f:
            json.dump(stats, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Processamento concluído!")
        print(f"   • Festivais processados: {len(geojson['features'])}")
        print(f"   • Continentes: {len(stats['continents'])}")
        print(f"   • Arquivos salvos em: dashboard/data/")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro no processamento: {e}")
        return False

if __name__ == "__main__":
    process_festivals_data()
