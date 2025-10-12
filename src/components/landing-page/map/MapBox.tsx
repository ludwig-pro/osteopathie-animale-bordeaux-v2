import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useEffect, useRef, useState } from 'react';
import { API_CONFIG } from '../../../lib/constants/api';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

type MapBoxProps = {
  lng: number;
  lat: number;
  label: string;
};

const MapBox = ({ lng, lat, label }: MapBoxProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [, setMap] = useState<mapboxgl.Map | null>(null);

  useEffect(() => {
    const mapboxToken = API_CONFIG.mapbox.token;

    if (!mapboxToken) {
      console.error('Mapbox token is missing from environment variables');
      return;
    }

    // Set the access token globally (recommended by Mapbox)
    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current!,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [lng, lat],
      zoom: 10,
      scrollZoom: false,
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-left');

    const popup = new mapboxgl.Popup({
      offset: 25,
      closeOnClick: true,
    }).setText(label);

    new mapboxgl.Marker().setLngLat([lng, lat]).setPopup(popup).addTo(map);
    setMap(map);

    return () => map.remove();
  }, []);

  return <div ref={mapContainerRef} style={mapContainerStyle} />;
};

export default MapBox;
