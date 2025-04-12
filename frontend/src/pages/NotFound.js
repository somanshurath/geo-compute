import React from 'react';
import '../App.css';
import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <div className="notfound">
            <div className="notfound-content">
                <h1>&lt; 404 &gt;</h1>
                <h3>Oops! Page Not Found</h3>
                <p>The page you are looking for does not exist or has been moved.</p>
                <Link to={'/'} className="btn btn-primary">
                    Return to Home
                </Link>
            </div>
        </div>
    );
};

export default NotFound;
