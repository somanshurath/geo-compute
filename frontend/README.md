# Geo-Compute

A web-based application for visualizing and analyzing geometric data. You can construct graphs on the `Canvas` page which can be used by graph layout algorithms to restructure the graph.
<br/>

Currently Fruchterman-Reingold algorithm has been implemented. The application is built using `React` and `Three.js` for rendering (all computations and rendering is being done in `2d only`, for purposes of simplicity).

![Geo-Compute](frontend\src\assets\image.png)

Further plans:

- Stats for drawing on canvas:
  - Number of edge crossings
  - Average edge length
  - Angular resolution
- Step-by-step animation of the algorithm
- Implement more algorithms
  - Tutte's algorithm
- Allow user to change hyperparameters of the algorithm
- Import/export graph data for universal support
