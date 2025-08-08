// main.js - Punto de entrada principal de la aplicación.
document.addEventListener('DOMContentLoaded', () => {
    loadAndProcessData()
        .then(() => {
            console.log('Aplicación iniciada correctamente.');
            initializeApplication();
        })
        .catch(error => {
            console.error('La aplicación no se pudo iniciar debido a un error de datos:', error);
            document.querySelector('.main-container').innerHTML = `
                <div style="text-align: center; padding: 4rem;">
                    <h1>Error al cargar los datos</h1>
                    <p>Lo sentimos, no se pudo cargar el archivo de datos. Asegúrate de que el archivo <code>MASTER.csv</code> existe en la carpeta <code>data/</code>.</p>
                </div>
            `;
        });
});

// ==================================================================================================================
// Módulo de Carga y Procesamiento de Datos (Data_Loader)
// ==================================================================================================================
let globalData = {
    original: [],
    byCountry: {},
    byYear: {},
    countryNames: [],
    worldTotalsByYear: []
};
const latestYear = 2021;
const startYearForIncrease = 1980;
let countryWithMaxCO2 = null;
let countryWithMaxPerCapita = null;

let chartsRendered = {};

function loadAndProcessData() {
    return new Promise((resolve, reject) => {
        d3.csv("data/MASTER.csv").then(data => {
            const cleanData = data.filter(d => 
                d.Country && d.Year && 
                !isNaN(+d['Total.CO2']) && 
                !isNaN(+d['Per.Capita.CO2']) && 
                !isNaN(+d.Temp_Change)
            );
            
            cleanData.forEach(d => {
                d.Year = +d.Year;
                d['Total.CO2'] = +d['Total.CO2'];
                d['Coal.CO2'] = +d['Coal.CO2'];
                d['Oil.CO2'] = +d['Oil.CO2'];
                d['Gas.CO2'] = +d['Gas.CO2'];
                d['Cement.CO2'] = +d['Cement.CO2'];
                d['Flaring.CO2'] = +d['Flaring.CO2'];
                d['Per.Capita.CO2'] = +d['Per.Capita.CO2'];
                d.Temp_Change = +d.Temp_Change;
                d['Total.Energy.Production'] = +d['Total.Energy.Production'];
                d['Renewables.and.other.Energy'] = +d['Renewables.and.other.Energy'];
                d.CH4 = +d.CH4;
                d.Population = +d.Population;
            });

            globalData.original = cleanData;
            globalData.byCountry = d3.group(cleanData, d => d.Country);
            globalData.byYear = d3.group(cleanData, d => d.Year);
            globalData.countryNames = Array.from(globalData.byCountry.keys()).filter(name => name !== 'World' && name !== 'EU-27').sort();
            
            const years = Array.from(globalData.byYear.keys()).sort((a, b) => a - b);
            globalData.worldTotalsByYear = years.map(year => {
                const yearData = globalData.byYear.get(year);
                if (!yearData) return null;
                const totalCO2 = d3.sum(yearData, d => d['Total.CO2']);
                const tempChanges = yearData.map(d => d.Temp_Change);
                const avgTempChange = d3.mean(tempChanges);
                const totalCoal = d3.sum(yearData, d => d['Coal.CO2']);
                const totalOil = d3.sum(yearData, d => d['Oil.CO2']);
                const totalGas = d3.sum(yearData, d => d['Gas.CO2']);
                const totalCement = d3.sum(yearData, d => d['Cement.CO2']);
                const totalCH4 = d3.sum(yearData, d => d.CH4);
                const totalPopulation = d3.sum(yearData, d => d.Population);
                const totalRenewableEnergy = d3.sum(yearData, d => d['Renewables.and.other.Energy']);

                return { 
                    Year: year, 
                    TotalCO2: totalCO2, 
                    Temp_Change: avgTempChange,
                    Coal: totalCoal,
                    Oil: totalOil,
                    Gas: totalGas,
                    Cement: totalCement,
                    CH4: totalCH4,
                    Population: totalPopulation,
                    RenewableEnergy: totalRenewableEnergy
                };
            }).filter(d => d !== null);

            const latestData = globalData.byYear.get(latestYear);
            if (latestData) {
                countryWithMaxCO2 = latestData.reduce((prev, current) => 
                    (prev['Total.CO2'] > current['Total.CO2']) ? prev : current
                );
                countryWithMaxPerCapita = latestData.reduce((prev, current) => 
                    (prev['Per.Capita.CO2'] > current['Per.Capita.CO2']) ? prev : current
                );
            }
            
            console.log("Datos cargados y procesados correctamente.");
            resolve();
        }).catch(error => {
            console.error("Error al cargar o procesar los datos:", error);
            reject(error);
        });
    });
}

// ==================================================================================================================
// Módulo de KPIs
// ==================================================================================================================
function calculateAndDisplayKPIs() {
    const latestWorldData = globalData.worldTotalsByYear.find(d => d.Year === latestYear);
    const startYearData = globalData.worldTotalsByYear.find(d => d.Year === startYearForIncrease);
    
    if (latestWorldData) {
        document.getElementById('kpi-co2-total').textContent = `${(latestWorldData.TotalCO2 / 1000000).toFixed(2)} M`;
        document.getElementById('kpi-temp-change').textContent = `${latestWorldData.Temp_Change.toFixed(2)} °C`;
        document.getElementById('kpi-ch4-total').textContent = `${(latestWorldData.CH4 / 1000).toFixed(2)} K`;
        document.getElementById('kpi-population-total').textContent = `${(latestWorldData.Population / 1000000000).toFixed(2)} Bn`;
        
        const coalPercent = (latestWorldData.Coal / latestWorldData.TotalCO2) * 100;
        document.getElementById('kpi-coal-percent').textContent = `${coalPercent.toFixed(1)}%`;
        
        const oilGasPercent = ((latestWorldData.Oil + latestWorldData.Gas) / latestWorldData.TotalCO2) * 100;
        document.getElementById('kpi-oil-gas-percent').textContent = `${oilGasPercent.toFixed(1)}%`;

        document.getElementById('kpi-renewable-energy').textContent = `${(latestWorldData.RenewableEnergy / 1000000).toFixed(2)} M`;
    }
    
    const kpiMajorCountry = document.getElementById('kpi-major-country');
    if (kpiMajorCountry) {
        kpiMajorCountry.textContent = countryWithMaxCO2 ? countryWithMaxCO2.Country : 'N/A';
    }
    
    const kpiPerCapitaCountry = document.getElementById('kpi-percapita-country');
    if (kpiPerCapitaCountry) {
        kpiPerCapitaCountry.textContent = countryWithMaxPerCapita ? countryWithMaxPerCapita.Country : 'N/A';
    }

    if (latestWorldData && startYearData) {
        const increase = ((latestWorldData.TotalCO2 - startYearData.TotalCO2) / startYearData.TotalCO2) * 100;
        document.getElementById('kpi-emissions-increase').textContent = `${increase.toFixed(0)}%`;
    }
}

// ==================================================================================================================
// Módulo de Gráficos (Chart_Renderer)
// ==================================================================================================================
const baseLayout = {
    font: { family: 'Roboto, sans-serif', color: '#c9d1d9' },
    plot_bgcolor: 'transparent',
    paper_bgcolor: 'transparent',
    xaxis: { gridcolor: '#2a2a2a', zerolinecolor: '#2a2a2a', tickfont: { color: '#c9d1d9' }, title: { standoff: 15 } },
    yaxis: { gridcolor: '#2a2a2a', zerolinecolor: '#2a2a2a', tickfont: { color: '#c9d1d9' }, title: { standoff: 15 } },
    title: { font: { family: 'Playfair Display, serif', size: 24, color: '#37b776' }, pad: { t: 20 } },
    hovermode: 'closest',
    margin: { t: 80, b: 60, l: 60, r: 20 }
};

function drawLineChart() {
    if (chartsRendered.lineChart) return;
    const trace = {
        x: globalData.worldTotalsByYear.map(d => d.Year),
        y: globalData.worldTotalsByYear.map(d => d.TotalCO2),
        mode: 'lines',
        name: 'Emisiones Globales',
        line: { color: '#37b776', width: 4 }
    };
    const layout = {
        ...baseLayout,
        title: 'Evolución de Emisiones Globales de CO2 (kt)',
        xaxis: { ...baseLayout.xaxis, title: 'Año' },
        yaxis: { ...baseLayout.yaxis, title: 'CO2 Total (kt)' },
        showlegend: false
    };
    Plotly.newPlot('lineChart', [trace], layout, { responsive: true });
    chartsRendered.lineChart = true;
}

function drawStackedAreaChart() {
    if (chartsRendered.stackedAreaChart) return;
    const years = globalData.worldTotalsByYear.map(d => d.Year);
    const sources = ['Coal', 'Oil', 'Gas', 'Cement'];
    const colors = ['#0074D9', '#FF4136', '#FF851B', '#AAAAAA'];
    const sourceNames = ['Carbón', 'Petróleo', 'Gas', 'Cemento'];

    const traces = sources.map((source, i) => {
        const yData = globalData.worldTotalsByYear.map(d => d[source]);
        return {
            x: years,
            y: yData,
            mode: 'lines',
            stackgroup: 'one',
            name: sourceNames[i],
            line: { width: 0, color: colors[i] },
            fillcolor: colors[i]
        };
    });

    const layout = {
        ...baseLayout,
        title: 'Emisiones Globales de CO2 por Fuente (kt)',
        xaxis: { ...baseLayout.xaxis, title: 'Año' },
        yaxis: { ...baseLayout.yaxis, title: 'CO2 Total (kt)' },
        legend: { x: 0, y: 1.1, orientation: 'h', font: { color: '#c9d1d9' } },
        margin: { t: 100, b: 60, l: 60, r: 20 }
    };
    Plotly.newPlot('stackedAreaChart', traces, layout, { responsive: true });
    chartsRendered.stackedAreaChart = true;
}

function drawChoroplethMap(year) {
    const yearData = globalData.byYear.get(year);
    if (!yearData) return;
    const filteredData = yearData.filter(d => d['ISO.alpha-3'] && d['Per.Capita.CO2'] > 0);
    const trace = {
        type: 'choropleth',
        locationmode: 'ISO-3',
        locations: filteredData.map(d => d['ISO.alpha-3']),
        z: filteredData.map(d => d['Per.Capita.CO2']),
        text: filteredData.map(d => `País: ${d.Country}<br>CO2 Per Cápita: ${d['Per.Capita.CO2'].toFixed(2)}t`),
        colorscale: 'Viridis',
        colorbar: { title: 'CO2 Per Cápita (t)', thickness: 15, titlefont: { color: '#c9d1d9' }, tickfont: { color: '#c9d1d9' } },
        marker: { line: { color: 'white', width: 0.5 } }
    };
    const layout = {
        ...baseLayout,
        title: `Emisiones de CO2 Per Cápita por País en ${year}`,
        geo: { 
            scope: 'world', 
            projection: { type: 'natural earth' }, 
            showcoastlines: true, 
            coastlinecolor: '#555', 
            showland: true, 
            landcolor: '#444',
            showframe: false,
            bgcolor: 'transparent'
        },
        height: 600,
        margin: { t: 80, b: 0, l: 0, r: 0 }
    };
    Plotly.newPlot('choroplethMap', [trace], layout, { responsive: true });
    chartsRendered.choroplethMap = true;
}

function drawTopEmittingCountries() {
    if (chartsRendered.topEmittingCountries) return;
    const yearData = globalData.byYear.get(latestYear);
    if (!yearData) return;
    const sortedData = yearData
        .filter(d => d.Country !== 'World' && d.Country !== 'EU-27' && d['Total.CO2'] > 0)
        .sort((a, b) => b['Total.CO2'] - a['Total.CO2'])
        .slice(0, 10);
    const trace = {
        x: sortedData.map(d => d['Total.CO2']),
        y: sortedData.map(d => d.Country),
        type: 'bar',
        orientation: 'h',
        marker: { color: '#37b776' }
    };
    const layout = {
        ...baseLayout,
        title: `Los 10 Países con Mayores Emisiones de CO2 en ${latestYear}`,
        xaxis: { ...baseLayout.xaxis, title: 'CO2 Total (kt)' },
        yaxis: { automargin: true },
        margin: { t: 80, b: 60, l: 150, r: 20 }
    };
    Plotly.newPlot('topEmittingCountries', [trace], layout, { responsive: true });
    chartsRendered.topEmittingCountries = true;
}

function drawScatterPlot(selectedCountry = "Todos") {
    const yearData = globalData.byYear.get(latestYear);
    if (!yearData) return;

    let filteredData = selectedCountry === "Todos"
        ? yearData
        : yearData.filter(d => d.Country === selectedCountry);

    const trace = {
        x: filteredData.map(d => d['Per.Capita.CO2']),
        y: filteredData.map(d => d['Temp_Change']),
        mode: 'markers',
        type: 'scatter',
        text: filteredData.map(d => `País: ${d.Country}<br>CO2 Per Cápita: ${d['Per.Capita.CO2'].toFixed(2)}t<br>Cambio de Temp: ${d['Temp_Change'].toFixed(2)}°C`),
        hoverinfo: 'text',
        marker: {
            size: filteredData.map(d => d['Total.CO2'] / 0.1),
            sizemode: 'area',
            color: filteredData.map(d => d['Temp_Change']),
            colorscale: 'Viridis',
            showscale: true,
            colorbar: { title: 'Cambio de Temp. (°C)', thickness: 15, titlefont: { color: '#c9d1d9' }, tickfont: { color: '#c9d1d9' } },
            opacity: 0.8
        }
    };

    const layout = {
        ...baseLayout,
        title: `Correlación: CO2 Per Cápita vs. Cambio de Temperatura (${latestYear})`,
        xaxis: { ...baseLayout.xaxis, title: 'CO2 Per Cápita (toneladas)' },
        yaxis: { ...baseLayout.yaxis, title: 'Cambio de Temperatura (°C)' }
    };

    Plotly.newPlot('scatterPlot', [trace], layout, { responsive: true });
}



function drawSourceChart(countryName) {
    if (chartsRendered.sourceChart && chartsRendered.sourceChart === countryName) return;
    const countryData = globalData.byCountry.get(countryName);
    if (!countryData) return;
    const yearData = countryData.find(d => d.Year === latestYear);
    if (!yearData) return;

    const labels = ['Carbón', 'Petróleo', 'Gas', 'Cemento'];
    const values = [yearData['Coal.CO2'], yearData['Oil.CO2'], yearData['Gas.CO2'], yearData['Cement.CO2']];
    const colors = ['#37b776', '#4CAF50', '#8BC34A', '#C0C0C0'];

    const trace = {
        values: values,
        labels: labels,
        type: 'pie',
        marker: { colors: colors },
        hole: .4,
        hoverinfo: 'label+percent',
        textinfo: 'label+percent',
        textposition: 'inside',
        insidetextfont: { color: 'white', size: 14 }
    };
    const layout = {
        ...baseLayout,
        title: `Fuentes de Emisiones de CO2 para ${countryName} (${latestYear})`,
        showlegend: true,
        legend: { x: 0.1, y: 1.1, font: { color: '#c9d1d9' } },
        margin: { t: 80, b: 50, l: 0, r: 0 }
    };
    Plotly.newPlot('sourceChart', [trace], layout, { responsive: true });
    chartsRendered.sourceChart = countryName;
}

function drawRenewableLineChart() {
    if (chartsRendered.renewableLineChart) return;
    const trace = {
        x: globalData.worldTotalsByYear.map(d => d.Year),
        y: globalData.worldTotalsByYear.map(d => d.RenewableEnergy),
        mode: 'lines',
        name: 'Energía Renovable Global',
        line: { color: '#4CAF50', width: 4 }
    };
    const layout = {
        ...baseLayout,
        title: 'Evolución de la Producción de Energía Renovable (kt)',
        xaxis: { ...baseLayout.xaxis, title: 'Año' },
        yaxis: { ...baseLayout.yaxis, title: 'Energía Renovable (kt)' },
        showlegend: false
    };
    Plotly.newPlot('renewableLineChart', [trace], layout, { responsive: true });
    chartsRendered.renewableLineChart = true;
}

// ==================================================================================================================
// Módulo de Scrollytelling (Scroll_Handler)
// ==================================================================================================================
function setupScrollytelling() {
    const sections = document.querySelectorAll('.story-section');
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.2
    };
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                const sectionId = entry.target.id;
                switch (sectionId) {
                    case 'section-1': drawLineChart(); break;
                    case 'section-2': drawStackedAreaChart(); break;
                    case 'section-3': drawChoroplethMap(parseInt(document.getElementById('mapYearRange').value)); break;
                    case 'section-4': drawTopEmittingCountries(); break;
                    case 'section-5': drawScatterPlot(); break;
                    case 'section-6': drawSourceChart(document.getElementById('sourceSelector').value); break;
                    case 'section-7': drawRenewableLineChart(); break;
                }
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });
}

function setupChartControls() {
    const sourceSelector = document.getElementById('sourceSelector');
    if (sourceSelector) {
        const countryNames = globalData.countryNames;
        countryNames.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            sourceSelector.appendChild(option);
        });
        sourceSelector.value = countryWithMaxCO2 ? countryWithMaxCO2.Country : 'World';
        sourceSelector.addEventListener('change', (e) => {
            drawSourceChart(e.target.value);
        });
    }

    const mapYearRange = document.getElementById('mapYearRange');
    const mapCurrentYearDisplay = document.getElementById('mapCurrentYearDisplay');
    if (mapYearRange && mapCurrentYearDisplay) {
        mapYearRange.addEventListener('input', () => {
            const year = parseInt(mapYearRange.value);
            mapCurrentYearDisplay.textContent = year;
            drawChoroplethMap(year);
        });
    }
}

function initializeApplication() {
    calculateAndDisplayKPIs();
    setupScrollytelling();
    setupChartControls();
}