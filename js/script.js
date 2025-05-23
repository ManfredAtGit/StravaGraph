/******************************
 * GLOBAL VARIABLES
 ******************************/
// global scope variables and functions
const originalNodeColors = new Map();
const originalLinkColors = new Map();
let link;
let node;
let label;
let simulation;
let allNodes = []; // Store all nodes
let allLinks = []; // Store all links
let selectedThreshold = 2; // Define it in the global scope
let graphGroup; // Declare graphGroup in the outer scope

const defaultNodeRadius = 10;
const selectedNodeRadius = 20;

// Search elements
const searchInput = d3.select("#node-search");
const searchResultsList = d3.select("#search-results");

// Zoom behavior
const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', zoomed);


const visualizationContainer = d3.select("#visualization");
const svg = visualizationContainer.append("svg")
    .attr("width", "100%")
    .attr("height", "100%")

    .on("click", function (event) {

        if (event.target === this) {
            globalThis.resetHighlight(); // Explicitly use globalThis
            globalThis.resetNodeSize(); // Ensure this is also accessible
            //selectedNodeId = null;
        }
    });

/******************************
 * INITIALIZATION
 ******************************/
document.getElementById('fit2screen').addEventListener('click', fitToScreen);
window.addEventListener("resize", resize);

document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    initTheme();
    setupUIEventListeners();
    setupSVGEventListeners();
    loadData()
        .then(({ nodes, links }) => {
            initGraph(nodes, links, selectedThreshold);
        })
        .catch(error => {
            console.error("Initialization failed:", error);
        });
}

// Theme management
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const currentTheme = localStorage.getItem('theme') || 
                        (prefersDarkScheme.matches ? 'dark' : 'light');
    
    // Apply the saved theme, or user's OS preference
    setTheme(currentTheme);

    // Set initial aria-label and title
    function updateAriaLabels(theme) {
        const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        themeToggle.setAttribute('aria-label', label);
        themeToggle.setAttribute('title', label);
    }

    // Call it initially
    updateAriaLabels(currentTheme);
    
    // Toggle theme when button is clicked
    themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });
    
    // Update icon based on current theme
    function updateThemeIcon(theme) {
        themeToggle.name = theme === 'dark' ? 'sun' : 'moon';
    }
    
    // Set the theme
    function setTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        updateThemeIcon(theme);
        updateAriaLabels(theme);
    }
    
    // Listen for changes in OS theme preference
    prefersDarkScheme.addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
}


/******************************
 * UI CONTROLS
 ******************************/
function setupUIEventListeners() {
    setupPanelToggle();
    setupLevelThreshold();
    setupSearchFunctionality();
}

/******************************
 * UI CONTROL FUNCTIONS
 ******************************/
function setupPanelToggle() {
    const toggleButton = document.getElementById('toggle-panel');
    const controlPanel = document.getElementById('control-panel');
    let isPanelCollapsed = false;

    toggleButton.addEventListener('click', (event) => {
        isPanelCollapsed = !isPanelCollapsed;
        controlPanel.classList.toggle('collapsed', isPanelCollapsed);
        toggleButton.name = isPanelCollapsed ? 'chevron-up' : 'chevron-down';
    });
}

function setupLevelThreshold() {
    const levelThreshold = document.getElementById('level-threshold');
    levelThreshold.addEventListener('sl-change', (event) => {
        const threshold = parseInt(event.target.value);
        updateGraph(allNodes, allLinks, threshold, graphGroup);
    });
}

function setupSearchFunctionality() {
    console.log("inside setupSearchFunctionality");

    // Search input handler
    searchInput.on("input", function() {
        console.log("inside searchInput.on input");
        const searchText = this.value.toLowerCase();
        if (searchText.length >= 4) {
            const matches = allNodes
                .filter(node => node.name.toLowerCase().includes(searchText))
                .slice(0, 12)
                .map(node => ({ id: node.id, name: node.name }));
            displaySearchResults(matches);
        } else {
            clearSearchResults();
        }
    });

    // Search on Enter key
    searchInput.on("keypress", function(event) {
        console.log("inside searchInput.on keypressed");
        if (event.key === "Enter" && this.value.length >= 4) {
            const searchText = this.value.toLowerCase();
            const matches = allNodes
                .filter(node => node.name.toLowerCase().includes(searchText))
                .slice(0, 12)
                .map(node => ({ id: node.id, name: node.name }));
            displaySearchResults(matches);
        }
    });


    /*
    searchInput.addEventListener('sl-input', (event) => {
        const searchText = event.target.value.toLowerCase();
        if (searchText.length >= 4) {
            const matches = allNodes
                .filter(node => node.name.toLowerCase().includes(searchText))
                .slice(0, 12)
                .map(node => ({ id: node.id, name: node.name }));
            displaySearchResults(matches);
        } else {
            clearSearchResults();
        }
    });
    */

    // Event listener to handle search result click
    // check for search-result-item class elements
    document.addEventListener('click', (event) => {
        if (event.target.matches('.search-result-item')) {
            console.log("click search result", event.target);
            const nodeId = event.target.dataset.id;
            centerOnNode(nodeId);
            highlightSelectedNode(nodeId);
            resizeSelectedNode(nodeId);
            clearSearchResults();
            searchInput.value = '';
        }
    });

}


/******************************
 * SEARCH FUNCTIONALITY
 ******************************/

// display search results as li-elements (of class search-result-item)in ul-list
function displaySearchResults(results) {
    console.log("inside displaySearchResults");
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';

    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No results found</div>';
        resultsContainer.classList.add('visible');
        return;
    }

    const ul = document.createElement('ul');
    results.forEach(result => {
        const li = document.createElement('li');
        li.className = 'search-result-item';
        li.textContent = result.name;
        li.dataset.id = result.id;
        ul.appendChild(li);
    });

    resultsContainer.appendChild(ul);
    resultsContainer.classList.add('visible');
};

function clearSearchResults() {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';
    resultsContainer.classList.remove('visible');
};
/*
function displaySearchResults(results) {
    console.log("inside displaySearchResults",results, searchResultsList);
    searchResultsList.selectAll("li")
        .data(results)
        .join("li")
        .text(d => d.name)
        .on("click", function(event, d) {
            highlightSelectedNode(+d.id);
            resizeSelectedNode(+d.id);
            centerOnNode(d.id);
            clearSearchResults();
            searchInput.property("value", "");
        });
}

function clearSearchResults() {
    searchResultsList.selectAll("li").remove();
}
*/

/******************************
 * SVG EVENT LISTENERS
 ******************************/
function setupSVGEventListeners() {
    // Handle click on SVG background to reset highlights
    svg.on("click", function(event) {
        if (event.target === this) {
            resetHighlight();
            resetNodeSize();
        }
    });

    /*
    .on("click", function (event) {

        if (event.target === this) {
            globalThis.resetHighlight(); // Explicitly use globalThis
            globalThis.resetNodeSize(); // Ensure this is also accessible
            //selectedNodeId = null;
        }
    });
    */

    // Initialize zoom behavior
    svg.call(zoom)
        .on("dblclick.zoom", null); // Disable double-click zoom

    // Add window resize handler
    window.addEventListener("resize", resize);
}

// Zoom handler
function zoomed(event) {
    graphGroup.attr("transform", event.transform);
}

// Simulation tick function
function tick() {
    if (link) {
        link.attr("x1", d => d.source?.x)
            .attr("y1", d => d.source?.y)
            .attr("x2", d => d.target?.x)
            .attr("y2", d => d.target?.y);
    }
    if (node) {
        node.attr("transform", d => `translate(${d.x},${d.y})`);
    }
    if (label) {
        label.attr("x", d => d.x)
             .attr("y", d => d.y);
    }
}


/******************************
 * GRAPH INITIALIZATION
 ******************************/

function initGraph(nodes, links, initialThreshold) {
    // Clear previous graph if exists
    svg.selectAll("*").remove();

    // Create graph group
    graphGroup = svg.append("g").attr("class", "graph-group");
    graphGroup.append("g").attr("class", "links");
    graphGroup.append("g").attr("class", "nodes");
    graphGroup.append("g").attr("class", "labels");
    const defs = graphGroup.append("defs");
    defs.append("marker")
        .attr("id", "end")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -1.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("class", "arrowhead");
    
    // Setup zoom behavior
    svg.call(zoom);

    // Initialize simulation
    simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(50))
        .force("charge", d3.forceManyBody().strength(-100))
        .force("center", d3.forceCenter(
            visualizationContainer.node().clientWidth / 2, 
            visualizationContainer.node().clientHeight / 2
        ))
        .on("tick", tick);

    // Initial graph display
    updateGraph(nodes, links, initialThreshold, graphGroup);

    // Add event listener to threshold input
    d3.select("#level-threshold").on("change", function() {
        selectedThreshold = +this.value;
        updateGraph(allNodes, allLinks, selectedThreshold, graphGroup);
    });
    
    /*
    //fitToScreen(); // Call fitToScreen after initial render
    */
}

/******************************
 * GRAPH UPDATE
 ******************************/
/*
// function to update graph based on selected threshold
// only nodes and connecting lonks with level below the threshold are shown
*/
function updateGraph(nodesToShow, linksToShow, threshold, currentGraphGroup) {
    console.log("updateGraph called with threshold:", threshold);

    // filter nodes and links based on the threshold
    // nodes with NaN level values are set to level=2
    const filteredNodes = nodesToShow.filter(node => {
        let levelValue = node.level;
        if (isNaN(parseFloat(levelValue))) {
            levelValue = 2;
        }
        const isLevelValid = levelValue !== "";
        const isBelowThreshold = isLevelValid && parseFloat(levelValue) < threshold;
        return isLevelValid && isBelowThreshold;
    });
    console.log("updateGraph ,  filteredNodes: ", filteredNodes);

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = linksToShow.filter(link =>
        filteredNodeIds.has(link.source?.id) && filteredNodeIds.has(link.target?.id)
    );

    // update the graph elements:
    // 1. nodes
    const updatedNodes = currentGraphGroup.select(".nodes").selectAll("circle").data(filteredNodes, d => d.id);
    updatedNodes.exit().remove();
    const enteredNodes = updatedNodes.enter().append("circle")
        .attr("class", "node")
        .attr("r", 10)
        .attr("node-id", d => d.id)
        .each(function (d) {
            originalNodeColors.set(d.id, d3.select(this).style("fill"));
        })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))
        .on("dblclick", highlightConnectedNodes);
    node = enteredNodes.merge(updatedNodes);

    // 2. labels
    const updatedLabels = currentGraphGroup.select(".labels").selectAll("text").data(filteredNodes, d => d.id);
    updatedLabels.exit().remove();
    const enteredLabels = updatedLabels.enter().append("text")
        .attr("class", "label")
        .text(d => d.name)
        .style("fill", "var(--graph-text)")  // Use CSS variable
        .attr("dx", 12)
        .attr("dy", ".35em");
    label = enteredLabels.merge(updatedLabels);

    // 3. links
    const updatedLinks = currentGraphGroup.select(".links").selectAll("line").data(filteredLinks, d => `${d.source?.id}-${d.target?.id}`);
    updatedLinks.exit().remove();
    const enteredLinks = updatedLinks.enter().append("line")
        .attr("class", "link")
        .attr("marker-end", "url(#end)")
        .style("stroke", "#999")
        .style("stroke-opacity", 0.6)
        .style("stroke-width", "1px")
        .each(function (d) {
            originalLinkColors.set(d, d3.select(this).style("stroke"));
        })
        .on("dblclick", globalThis.highlightLink); // Explicitly use globalThis
    link = enteredLinks.merge(updatedLinks);

    simulation.nodes(filteredNodes)
        .force("link").links(filteredLinks);
    simulation.alpha(1).restart();
}

/******************************
 * NODE & LINK INTERACTIONS
 ******************************/

function highlightConnectedNodes(event, d) {
    event.stopPropagation();
    globalThis.resetHighlight(); // Explicitly use globalThis
    //resetHighlight();
    const connectedNodeIds = new Set([d.id]);
    const connectedLinks = [];
    if (allLinks) {
        allLinks.forEach(link => {
            if (link.source?.id === d.id) {
                connectedNodeIds.add(link.target?.id);
                connectedLinks.push(link);
            } else if (link.target?.id === d.id) {
                connectedNodeIds.add(link.source?.id);
                connectedLinks.push(link);
            }
        });
    }
    d3.select(this).style("fill", "red");
    d3.selectAll(".node")
        .filter(node => connectedNodeIds.has(node.id))
        .style("fill", "red");
    d3.selectAll(".link")
        .filter(link => connectedLinks.includes(link))
        .style("stroke", "red")
        .style("stroke-width", "3px");
}

// Function to highlight a node in lime
function highlightSelectedNode(nodeId) {
    node.style("fill", d => +d.id === +nodeId ? "lime" : originalNodeColors.get(d.id));
}
  
function highlightLink(event, d) {
    event.stopPropagation();
    resetHighlight();
    d3.select(this).style("stroke", "red").style("stroke-width", "3px");
    d3.selectAll(".node")
      .filter(node => node.id === d.source?.id || node.id === d.target?.id)
      .style("fill", "red");
}

function resetHighlight() {
    if (link) {
        link.style("stroke", d => originalLinkColors.get(d)).style("stroke-width", "1px");
    }
    if (node) {
        node.style("fill", d => originalNodeColors.get(d.id));
    }
}

// Function to reset the size of all nodes
function resetNodeSize() {
    if (node) {
        node.attr("r", defaultNodeRadius);
    }
}


// Function to resize the selected node
function resizeSelectedNode(nodeId) {
  node.attr("r", d => +d.id === +nodeId ? selectedNodeRadius : defaultNodeRadius);
}


function centerOnNode(nodeId) {
    const selectedNode = allNodes.find(node => +node.id === +nodeId);
    if (selectedNode && svg) {
        const width = visualizationContainer.node().clientWidth;
        const height = visualizationContainer.node().clientHeight;

        const targetX = width / 2 - selectedNode.x;
        const targetY = height / 2 - selectedNode.y;

        svg.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity.translate(targetX, targetY));
    }
}



/******************************
 * DRAG HANDLERS
 ******************************/

function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

/******************************
 * DATA LOADING
 ******************************/
function loadData() {
    const nodesDataUrl = "https://raw.githubusercontent.com/ManfredAtGit/gpxstore/refs/heads/main/all_nodes_df.csv";
    const edgesDataUrl = "https://raw.githubusercontent.com/ManfredAtGit/gpxstore/refs/heads/main/follow_pairs_df.csv";
    return Promise.all([
        d3.tsv(nodesDataUrl),
        d3.tsv(edgesDataUrl)
    ]).then(function ([nodesData, edgesData]) {
        allNodes = nodesData.map(d => ({ id: d.athlete_id, name: d.name, level: +d.level, ...d }));
        allLinks = edgesData.map(d => ({ source: d.id1, target: d.id2, name1: d.name1, name2: d.name2, ...d }));
        const nodeMap = new Map(allNodes.map(node => [node.id, node]));
        allLinks.forEach(link => { link.source = nodeMap.get(link.source); link.target = nodeMap.get(link.target); });

        return { nodes: allNodes, links: allLinks }; // Return the original data
    });
}



/******************************
 * UTILITY FUNCTIONS
 ******************************/
//document.getElementById('fit2screen').addEventListener('click', fitToScreen);
function fitToScreen() {
    if (!node || node.empty()) return;

    const svgNode = svg.node();
    const { width: svgWidth, height: svgHeight } = svgNode.getBoundingClientRect();

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    node.each(d => {
        minX = Math.min(minX, d.x);
        maxX = Math.max(maxX, d.x);
        minY = Math.min(minY, d.y);
        maxY = Math.max(maxY, d.y);
    });

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;

    if (graphWidth === 0 || graphHeight === 0) return;

    const scale = Math.min(svgWidth / graphWidth, svgHeight / graphHeight) * 0.9;
    const translateX = svgWidth / 2 - scale * (minX + graphWidth / 2);
    const translateY = svgHeight / 2 - scale * (minY + graphHeight / 2);

    const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);

    svg.transition()
        .duration(750)
        .call(zoom.transform, transform);
}


//window.addEventListener("resize", resize);

function resize() {
    width = visualizationContainer.node().clientWidth;
    height = visualizationContainer.node().clientHeight;
    svg.attr("width", width).attr("height", height);
    simulation.force("center", d3.forceCenter(width / 2, height / 2));
    simulation.alpha(0.3).restart();
}

// -------------------------------------


