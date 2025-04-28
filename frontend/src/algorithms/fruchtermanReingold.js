export const fruchtermanReingold = (iterations, nodes, edges) => {
    const k = 2; // ?
    const temperature = 5.0; // ?

    let positions = nodes.map(node => [...node]);

    for (let iter = 0; iter < iterations; iter++) {
        const coolingFactor = temperature * Math.pow(1.0 - iter / iterations, 2); // ?
        let displacements = Array(nodes.length).fill().map(() => [0, 0, 0]);

        for (let i = 0; i < nodes.length; i++) {
            for (let j = 0; j < nodes.length; j++) {
                if (i !== j) {
                    const dx = positions[i][0] - positions[j][0];
                    const dy = positions[i][1] - positions[j][1];
                    const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;

                    const repulsiveForce = k * k / distance;

                    displacements[i][0] += (dx / distance) * repulsiveForce;
                    displacements[i][1] += (dy / distance) * repulsiveForce;
                }
            }
        }

        for (let i = 0; i < edges.length; i++) {
            for (let j = 0; j < edges[i].length; j++) {
                const neighbor = edges[i][j];

                if (i < neighbor) {
                    const dx = positions[i][0] - positions[neighbor][0];
                    const dy = positions[i][1] - positions[neighbor][1];
                    const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;

                    const attractiveForce = distance * distance / k;

                    displacements[i][0] -= (dx / distance) * attractiveForce;
                    displacements[i][1] -= (dy / distance) * attractiveForce;
                    displacements[neighbor][0] += (dx / distance) * attractiveForce;
                    displacements[neighbor][1] += (dy / distance) * attractiveForce;
                }
            }
        }

        for (let i = 0; i < nodes.length; i++) {
            const dx = displacements[i][0];
            const dy = displacements[i][1];
            const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;

            const limitedDistance = Math.min(distance, coolingFactor);

            positions[i][0] += (dx / distance) * limitedDistance;
            positions[i][1] += (dy / distance) * limitedDistance;
            positions[i][2] = 0;
        }
    }
    return positions;
};
