import React, { useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';

const LoadingSpinner = () => {


    return (
        <>
            {
                <div style={{ position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <CircularProgress color="secondary" />
                    { <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 999, backgroundColor: 'rgba(0, 0, 0, 0.5)' }} />}

                </div>

            }
        </>
    );
}

export default LoadingSpinner;
