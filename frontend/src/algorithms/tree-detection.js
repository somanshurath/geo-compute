export async function fnIsTree(adjList, numVerts, numEdges) {
    if (numEdges !== Object.keys(adjList).length - 1) {
        return false;
    }

    const visited = new Array(numVerts).fill(false);
    const stack = [Object.keys(adjList)[0]];
    let count = 0;

    while (stack.length > 0) {
        const vertex = stack.pop();
        if (visited[vertex]) {
            continue;
        }
        visited[vertex] = true;
        count++;

        for (const neighbor of adjList[vertex]) {
            if (!visited[neighbor]) {
                stack.push(neighbor);
            }
        }
    }

    return count === Object.keys(adjList).length;
}
