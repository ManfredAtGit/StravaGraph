# Strava Network Graph

Interactive graph of the Strava cycling network of a specific athlete.
Starting point for the graphis a specific Strava athlete (level 0). Then we collect all athletes the starting athlete is following (level 1; approx 60 athletes) . Next we collect all athletes the level 1 athletes are following (level 2; approx 6000 athletes) and so on. Currently, we limit the grapgh building at level 2.

The graph is visualized using D3.js and is interactive. You can zoom in and out, pan, seach for specific athletes, filter nodes by level and switch between light and dark mode.
   

## features and user interaction

- dblclick on a node to highlight it and its neighbors.
- dblclick on a link to highlight it and its source and target nodes.
- search for specific athletes using the search bar.
- click on a search result to highlight the node and center the graph on it.
- click on the graph to reset the highlight.
- click on the toggle panel button to collapse or expand the panel.
- click on the level threshold slider to filter nodes by level.
- click on the theme toggle button to switch between light and dark mode.
- click on the fit to screen button to fit the graph to the screen.

## software stack

- Javascript, HTML, CSS
- D3.js
- Shoelace

## data extraction and preparation
- data is extracted from Strava using beautifulsoup
- data is further transformed using pandas


## app is live at github.io
https://manfredatgit.github.io/StravaGraph/
