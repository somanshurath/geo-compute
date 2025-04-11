import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

function Canvas() {
    const mountRef = useRef(null);

    const node_geometry = new THREE.CircleGeometry(0.2, 32);
    const node_material = new THREE.MeshBasicMaterial({ color: 0x61dafb });

    // make an array to store the nodes
    const nodes = [[1, 1, 0], [2, 2, 0], [3, 3, 0]];


    useEffect(() => {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x282c34);

        const aspectRatio = window.innerWidth / window.innerHeight;
        const camera = new THREE.OrthographicCamera(
            -aspectRatio * 5, // left
            aspectRatio * 5,  // right
            5,               // top
            -5,              // bottom
            0.1,             // near clipping plane
            1000             // far clipping plane
        );
        camera.position.z = 5;

        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        if (mountRef.current && !mountRef.current.hasChildNodes()) {
            mountRef.current.appendChild(renderer.domElement);
        }

        const gridHelper = new THREE.GridHelper(20, 20);
        gridHelper.rotation.x = Math.PI / 2;
        scene.add(gridHelper);

        nodes.forEach(node => {
            const nodeMesh = new THREE.Mesh(node_geometry, node_material);
            nodeMesh.position.set(node[0], node[1], node[2]);
            scene.add(nodeMesh);
        });

        const animate = () => {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            renderer.dispose();
            if (mountRef.current) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, []);

    return (
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
    );
}

export default Canvas;
