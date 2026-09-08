'use client';

import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import mockForecasts from '@/data/mock/forecast.json';
import { ForecastSnapshot } from '@/lib/contracts/forecast';

import { useMap } from './Map';

interface AnimationOverlayProps {
  isAnimationEnabled: boolean;
  activeLayers: string[];
}

export const AnimationOverlay: React.FC<AnimationOverlayProps> = ({ isAnimationEnabled, activeLayers }) => {
  const { map, isLoaded } = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (!map || !isLoaded || !isAnimationEnabled) {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
      if (canvasRef.current && canvasRef.current.parentNode) {
        canvasRef.current.parentNode.removeChild(canvasRef.current);
        canvasRef.current = null;
      }
      return;
    }

    // Only render if at least one animation layer is active
    const showRain = activeLayers.includes('rainfall');
    const showWind = activeLayers.includes('windStreamlines');
    
    if (!showRain && !showWind) return;

    // Create Canvas
    const container = map.getCanvasContainer();
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;';
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    map.on('resize', resize);

    // Filter alert districts for Rain/Wind density
    const forecasts = mockForecasts as ForecastSnapshot[];
    const alertDistricts = forecasts.filter(f => ['RED', 'ORANGE', 'YELLOW'].includes(f.rainfall.alertLevel));

    // ==========================================
    // 1. RAIN PARTICLES SETUP
    // ==========================================
    type RainParticle = { lng: number; lat: number; yOffset: number; len: number; speed: number; opacity: number; level: string; districtId: string; };
    const rainParticles: RainParticle[] = [];

    if (showRain && alertDistricts.length > 0) {
      alertDistricts.forEach(d => {
        const level = d.rainfall.alertLevel;
        const count = level === 'RED' ? 150 : level === 'ORANGE' ? 80 : 30;
        const radius = 0.4; // approx degrees spread

        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * radius;
          rainParticles.push({
            lng: d.geography.lon + Math.cos(angle) * r,
            lat: d.geography.lat + Math.sin(angle) * r * 0.8,
            yOffset: -Math.random() * 300, // start high
            speed: level === 'RED' ? 6 + Math.random()*2 : level === 'ORANGE' ? 4 + Math.random()*2 : 3 + Math.random(),
            len: level === 'RED' ? 18 : level === 'ORANGE' ? 14 : 10,
            opacity: level === 'RED' ? 0.7 : level === 'ORANGE' ? 0.5 : 0.35,
            level: level,
            districtId: d.geography.districtId,
          });
        }
      });
    }

    // ==========================================
    // 2. WIND STREAMLINES SETUP
    // ==========================================
    type WindParticle = { lng: number; lat: number; age: number; maxAge: number; speedLng: number; speedLat: number; isBoosted: boolean; level: string; };
    const windParticles: WindParticle[] = [];

    if (showWind) {
      // Background Wind
      for (let i = 0; i < 150; i++) {
        windParticles.push({
          lng: 68 + Math.random() * 30, // Covers India approx bounds
          lat: 8 + Math.random() * 25,
          age: Math.random() * 60,
          maxAge: 40 + Math.random() * 40,
          speedLng: 0.01 + Math.random() * 0.01,
          speedLat: -0.005 + Math.random() * 0.01,
          isBoosted: false,
          level: 'NORMAL',
        });
      }

      // Boosted Wind over Alert Zones
      alertDistricts.forEach(d => {
        const level = d.rainfall.alertLevel;
        const count = level === 'RED' ? 80 : level === 'ORANGE' ? 40 : 20;
        const radius = 0.5;

        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * radius;
          windParticles.push({
            lng: d.geography.lon + Math.cos(angle) * r,
            lat: d.geography.lat + Math.sin(angle) * r * 0.8,
            age: Math.random() * 40,
            maxAge: 30 + Math.random() * 30,
            speedLng: level === 'RED' ? 0.03 : level === 'ORANGE' ? 0.02 : 0.015,
            speedLat: -0.005 - Math.random() * 0.01,
            isBoosted: true,
            level: level,
          });
        }
      });
    }

    // ==========================================
    // ANIMATION LOOP
    // ==========================================
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // --- Draw Wind ---
      if (showWind) {
        windParticles.forEach(p => {
          const startPx = map.project([p.lng, p.lat]);
          const nextLng = p.lng + p.speedLng * 3;
          const nextLat = p.lat + p.speedLat * 3;
          const endPx = map.project([nextLng, nextLat]);

          if (startPx.x > -50 && startPx.x < canvas.width + 50 && startPx.y > -50 && startPx.y < canvas.height + 50) {
            const alpha = Math.sin((p.age / p.maxAge) * Math.PI);
            let color = '200, 255, 61'; // Chartreuse
            if (p.isBoosted) {
              if (p.level === 'RED') color = '255, 59, 48';
              else if (p.level === 'ORANGE') color = '255, 179, 71';
            }
            
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${color}, ${alpha * (p.isBoosted ? 0.85 : 0.4)})`;
            ctx.lineWidth = p.level === 'RED' ? 2.5 : p.level === 'ORANGE' ? 1.8 : 1.2;
            ctx.lineCap = 'round';
            ctx.moveTo(startPx.x, startPx.y);
            ctx.lineTo(endPx.x, endPx.y);
            ctx.stroke();
          }

          p.lng += p.speedLng;
          p.lat += p.speedLat;
          p.age++;

          if (p.age > p.maxAge) {
            p.age = 0;
            // Reposition
            if (!p.isBoosted || alertDistricts.length === 0) {
              p.lng = 68 + Math.random() * 30;
              p.lat = 8 + Math.random() * 25;
            } else {
              // find the district again
              const d = alertDistricts.find(ad => ad.rainfall.alertLevel === p.level) || alertDistricts[0];
              const angle = Math.random() * Math.PI * 2;
              const r = Math.random() * 0.5;
              p.lng = d.geography.lon + Math.cos(angle) * r;
              p.lat = d.geography.lat + Math.sin(angle) * r * 0.8;
            }
          }
        });
      }

      // --- Draw Rain ---
      if (showRain) {
        rainParticles.forEach(p => {
          const px = map.project([p.lng, p.lat]);

          if (px.x > -50 && px.x < canvas.width + 50 && px.y + p.yOffset > -50 && px.y + p.yOffset < canvas.height + 50) {
            const color = p.level === 'RED' ? `rgba(150, 200, 255, ${p.opacity})`
              : p.level === 'ORANGE' ? `rgba(180, 210, 255, ${p.opacity})`
              : `rgba(200, 220, 255, ${p.opacity})`;

            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.moveTo(px.x, px.y + p.yOffset);
            ctx.lineTo(px.x - 1, px.y + p.yOffset + p.len); // slight wind slant
            ctx.stroke();
          }

          p.yOffset += p.speed;

          if (p.yOffset > 0) {
            p.yOffset = -150 - Math.random() * 150;
            if (alertDistricts.length > 0) {
              const d = alertDistricts.find(ad => ad.geography.districtId === p.districtId) || alertDistricts[0];
              const angle = Math.random() * Math.PI * 2;
              const r = Math.random() * 0.4;
              p.lng = d.geography.lon + Math.cos(angle) * r;
              p.lat = d.geography.lat + Math.sin(angle) * r * 0.8;
            }
          }
        });
      }

      animRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      map.off('resize', resize);
      if (canvasRef.current && canvasRef.current.parentNode) {
        canvasRef.current.parentNode.removeChild(canvasRef.current);
      }
      canvasRef.current = null;
    };
  }, [map, isLoaded, isAnimationEnabled, activeLayers]);

  return null;
};
