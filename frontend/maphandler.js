const map = L.map('map', {preferCanvas: true}).setView([35.652832, 139.700745], 6);

const welcomeContent = `<p>In my neighborhood there is seemingly only Lawson conbinis. This lead me to take a look at how common 
    these pockets of exclusive territory are. This is a pretty surface level analysis of all locations of conbini in Japan. 
    (Only the top few brands)</p></br><h2>How it works</h2><p>If you zoom in on a prefecture, the map will switch over to a more detailed
    map. The detailed map shows territory based on what the closest conbini brand is for a given place.</p><p>
    Using the menu in the top left, you can show all individual conbini locations, or force detailed maps at all times.</p>`

const base = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    edgeBufferTiles: 2
});
base.addTo(map);
// Helps keep geojson loaded when its off screen
const paddedRenderer = L.svg({ padding: 10 });
const regionalLayers = [];
const regionalConbinis = [];
let nihonLayer, regionalLayerGroup, conbiniLayer;
loadGeoJSON();

const helloDialog =  L.control.window(map,{title:'Conbini Wars', content: welcomeContent}).show()

async function loadGeoJSON() {
    try {
        let response = await fetch('assets/japan.geojson');
        let data = await response.json();
        nihonLayer = L.geoJSON(data, {
            style: setRegionStyle,
            onEachFeature: function (feature, layer) {
                layer.regionId = feature.properties.nam;
                layer.bindTooltip(getRegionLeaderboard(feature.properties.nam, feature.properties.brandLists))
            },
            renderer: paddedRenderer
        }).addTo(map)


        // Load point datasets for each region
        nihonLayer.eachLayer(regionLayer => {
            fetch(`assets/dumps_limited/${regionLayer.regionId}.geojson`)
                .then(response => response.json())
                .then(data => {
                    regionLayer.geoLayer = L.geoJSON(data,
                    {
                        style: setLocalStyle,
                        onEachFeature: setCellProps,
                        renderer: paddedRenderer
                    })
                    regionalLayers.push(regionLayer.geoLayer);
                })
                .catch(error => {
                    console.error('Error loading point data:', error);
                });
        });
        
        response = await fetch('assets/all_points.geojson')
            .then(response => response.json())
            .then(data => {
                let pointsJson = L.geoJSON(data,
                {
                    style: setLocalStyle,
                    onEachFeature: setCellProps,
                })
                conbiniLayer = donutCluster()
                conbiniLayer.addLayer(pointsJson)
                populateControls()
            })
            .catch(error => {
                console.error('Error loading point data:', error);
            });


        // Update point layer visibility on map move
        map.on('moveend', function () {
            nihonLayer.eachLayer(regionLayer => {
                if (map.getZoom() >= 10) {
                    if (map.getBounds().intersects(regionLayer.getBounds())) {
                        regionLayer.geoLayer.addTo(map);
                    } else {
                        if (!forceAllRegionsEnabled()) {
                            regionLayer.geoLayer.remove();
                        }
                    }
                    nihonLayer.remove();
                } else {
                    if (!forceAllRegionsEnabled()) {
                        regionLayer.geoLayer.remove();
                        nihonLayer.addTo(map);
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error loading GeoJSON:', error);
        return null;
    }
}

function setRegionStyle(feature) {
    return {
        fillColor: feature.properties.fill,
        color: "#444444",
        fillOpacity: .4,
        opacity: .3
    };
}

function setLocalStyle(feature) {
    return {
        fillColor: feature.properties.fill,
        color: "#aaaaaa",
        fillOpacity: .4,
        opacity: .2
    };
}

function setCellProps(feature, layer){
    layer.bindPopup(feature.properties.brand);
}

map.attributionControl.setPrefix(false)

function getRegionLeaderboard(regionName, counts) {
    let tableHTML = `<table>
            ${regionName}
            <tr>
                <th>Brand</th>
                <th>Count</th>
            </tr>`;

    for (const [key, value] of Object.entries(counts)) {
        tableHTML += `<tr>
                <td>${key}</td>
                <td>${value}</td>
            </tr> `;
    }

    tableHTML += `</table>`;
    return tableHTML;
}

const legend = L.control.Legend({
    position: "bottomleft",
    collapsed: false,
    symbolWidth: 24,
    opacity: 1,
    column: 2,
    legends: [{
        label: "7-Eleven",
        type: "rectangle",
        color: "#EE2526",
        fillColor: "#EE2526",
        weight: 2
    }, {
        label: "Family Mart",
        type: "rectangle",
        color: "#00a041",
        fillColor: "#00a041",
        weight: 2
    }, {
        label: "Lawson",
        type: "rectangle",
        color: "blue",
        fillColor: "blue",
        weight: 2
    }, {
        label: "Ministop",
        type: "rectangle",
        color: "yellow",
        fillColor: "yellow",
        weight: 2
    }, {
        label: "SeicoMart",
        type: "rectangle",
        color: "#E97451",
        fillColor: "#E97451",
        weight: 2
    }, ]
}).addTo(map);

function populateControls() {
    regionalLayerGroup = L.layerGroup(regionalLayers);
    L.control.layers(null, 
        {
            "Show Prefecture": nihonLayer, 
            "Force All Local":  regionalLayerGroup, 
            "Show Conbinis": conbiniLayer
        }
    ).addTo(map);
    conbiniLayer.addTo(map);
}
// GitHub button
const githubButton = L.Control.extend({
    options: {
        position: 'bottomleft'
    },

    onAdd: function (map) {
        const link = L.DomUtil.create('button', 'github-button');
        link.innerHTML = '<i class="fa fa-github" style="font-size:48px;color:black"></i>';
        link.onclick = function () {
            window.open("https://github.com", '_blank').focus()
        };
        return link;
    }
});

// Info button
const infoButton = L.Control.extend({
    options: {
        position: 'bottomleft'
    },

    onAdd: function (map) {
        const button = L.DomUtil.create('button', 'info-button');
        button.innerHTML = '<i class="fa fa-info-circle" style="font-size:48px;color:black"></i>';
        button.onclick = function () {
            helloDialog.show();
        };
        return button;
    }
});

// Add buttons to the map
map.addControl(new githubButton());
map.addControl(new infoButton());

function forceAllRegionsEnabled() {
    return regionalLayerGroup && regionalLayerGroup._map;
}

function forceAllConbinisEnabled() {
    return regionalConbiniGroup && regionalConbiniGroup._map;
}

function donutCluster() {
    return L.DonutCluster(
        {
            chunkedLoading: true
        }, {
            key: 'brand',
            order: ['7-Eleven', 'FamilyMart', 'Lawson', 'Ministop', "Seicomart"],
            arcColorDict: {
                "7-Eleven": '#EE2526',
                "FamilyMart": '#00a041',
                Lawson: 'blue',
                Ministop: 'yellow',
                Seicomart: '#E97451'
            },
            style: {
                size: 40,
                fill: '#00000088',
                opacity: 1,
                weight: 7
            },
            // A class to assign to the donut center text
            textClassName: 'donut-text',
            // The value to be displayed in the donut center text
            // Could be `count`, `total` or `sum` (defaults).
            textContent: 'sum',
            // If lodash is available text content can be based on a template.
            textTemplate: '<%= data.active.value %>/<%= sum %>',
            // A class to assign to the donut legend text on mouse hover
            legendClassName: 'donut-legend',
            // The value to be displayed in the donut legend text on mouse hover
            // Could be `percentage` or `value` (defaults).
            legendContent: 'value',
            // Function used to format value numbers for display
            // Possible types are `count`, `percentage` or `value` and can help to use different formattings
            format: (value, type) => value.toFixed(0),
        }
    );
}