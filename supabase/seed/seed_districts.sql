-- Seed Data for Indian States & Districts
-- HazardGuard SIH 2026

-- Insert States
INSERT INTO states (id, name) VALUES
('MH', 'Maharashtra'),
('KL', 'Kerala'),
('OR', 'Odisha'),
('GJ', 'Gujarat'),
('AS', 'Assam'),
('UT', 'Uttarakhand'),
('HP', 'Himachal Pradesh'),
('WB', 'West Bengal'),
('AP', 'Andhra Pradesh'),
('TS', 'Telangana'),
('TN', 'Tamil Nadu'),
('KA', 'Karnataka'),
('BR', 'Bihar'),
('MP', 'Madhya Pradesh'),
('RJ', 'Rajasthan'),
('UP', 'Uttar Pradesh'),
('DL', 'Delhi'),
('PB', 'Punjab'),
('HR', 'Haryana'),
('JH', 'Jharkhand'),
('CT', 'Chhattisgarh')
ON CONFLICT (id) DO NOTHING;

-- Insert Districts with Centroids and Demographics
INSERT INTO districts (id, state_id, name, centroid, area_km2, population) VALUES
('OR_PURI', 'OR', 'Puri', ST_SetSRID(ST_MakePoint(85.8312, 19.8135), 4326), 3479, 1698730),
('KL_WAYANAD', 'KL', 'Wayanad', ST_SetSRID(ST_MakePoint(76.1320, 11.6854), 4326), 2131, 817420),
('AS_CACHAR', 'AS', 'Cachar', ST_SetSRID(ST_MakePoint(92.7789, 24.8333), 4326), 3786, 1736617),
('GJ_VALSAD', 'GJ', 'Valsad', ST_SetSRID(ST_MakePoint(72.9300, 20.6100), 4326), 3034, 1705678),
('MH_PUNE', 'MH', 'Pune', ST_SetSRID(ST_MakePoint(73.8567, 18.5204), 4326), 15643, 9429408),
('MH_MUMBAI', 'MH', 'Mumbai Suburban', ST_SetSRID(ST_MakePoint(72.8777, 19.0760), 4326), 446, 9356962),
('MH_RATNAGIRI', 'MH', 'Ratnagiri', ST_SetSRID(ST_MakePoint(73.3120, 16.9902), 4326), 8208, 1615069),
('UT_DEHRADUN', 'UT', 'Dehradun', ST_SetSRID(ST_MakePoint(78.0322, 30.3165), 4326), 3088, 1696694),
('HP_MANDI', 'HP', 'Mandi', ST_SetSRID(ST_MakePoint(76.9320, 31.7087), 4326), 3950, 999777),
('WB_DARJEELING', 'WB', 'Darjeeling', ST_SetSRID(ST_MakePoint(88.2627, 27.0360), 4326), 2092, 1846823),
('AP_VISAKHAPATNAM', 'AP', 'Visakhapatnam', ST_SetSRID(ST_MakePoint(83.2185, 17.6868), 4326), 1048, 2358412),
('KL_ERNAKULAM', 'KL', 'Ernakulam', ST_SetSRID(ST_MakePoint(76.2999, 9.9816), 4326), 3068, 3282388),
('BR_PATNA', 'BR', 'Patna', ST_SetSRID(ST_MakePoint(85.1376, 25.5941), 4326), 3202, 5838465),
('BR_SUPAUL', 'BR', 'Supaul', ST_SetSRID(ST_MakePoint(86.6053, 26.1260), 4326), 2425, 2229076),
('MP_HOSHANGABAD', 'MP', 'Narmadapuram', ST_SetSRID(ST_MakePoint(77.7200, 22.7500), 4326), 5408, 1241350),
('MP_JABALPUR', 'MP', 'Jabalpur', ST_SetSRID(ST_MakePoint(79.9864, 23.1815), 4326), 5211, 2463289),
('TS_BHADRADRI', 'TS', 'Bhadradri Kothagudem', ST_SetSRID(ST_MakePoint(80.6200, 17.5500), 4326), 7483, 1069261),
('TS_HYDERABAD', 'TS', 'Hyderabad', ST_SetSRID(ST_MakePoint(78.4867, 17.3850), 4326), 217, 3943323),
('TN_NILGIRIS', 'TN', 'Nilgiris', ST_SetSRID(ST_MakePoint(76.6950, 11.4100), 4326), 2549, 735394),
('TN_CHENNAI', 'TN', 'Chennai', ST_SetSRID(ST_MakePoint(80.2707, 13.0827), 4326), 426, 4646732),
('KA_UDUPI', 'KA', 'Udupi', ST_SetSRID(ST_MakePoint(74.7421, 13.3409), 4326), 3582, 1177361),
('KA_BENGALURU_URBAN', 'KA', 'Bengaluru Urban', ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326), 2196, 9621551),
('RJ_JAIPUR', 'RJ', 'Jaipur', ST_SetSRID(ST_MakePoint(75.7873, 26.9124), 4326), 11143, 6626178),
('RJ_JODHPUR', 'RJ', 'Jodhpur', ST_SetSRID(ST_MakePoint(73.0243, 26.2389), 4326), 22850, 3687002),
('GJ_AHMEDABAD', 'GJ', 'Ahmedabad', ST_SetSRID(ST_MakePoint(72.5714, 23.0225), 4326), 8086, 7214225),
('UP_LUCKNOW', 'UP', 'Lucknow', ST_SetSRID(ST_MakePoint(80.9462, 26.8467), 4326), 2528, 4589838),
('UP_VARANASI', 'UP', 'Varanasi', ST_SetSRID(ST_MakePoint(82.9739, 25.3176), 4326), 1535, 3676841),
('DL_NEW_DELHI', 'DL', 'New Delhi', ST_SetSRID(ST_MakePoint(77.2090, 28.6139), 4326), 1484, 16787941),
('PB_LUDHIANA', 'PB', 'Ludhiana', ST_SetSRID(ST_MakePoint(75.8573, 30.9010), 4326), 3702, 3498739),
('HR_GURUGRAM', 'HR', 'Gurugram', ST_SetSRID(ST_MakePoint(77.0266, 28.4595), 4326), 1258, 1514432),
('JH_RANCHI', 'JH', 'Ranchi', ST_SetSRID(ST_MakePoint(85.3096, 23.3441), 4326), 5097, 2914253),
('CT_RAIPUR', 'CT', 'Raipur', ST_SetSRID(ST_MakePoint(81.6296, 21.2514), 4326), 2892, 2160876)
ON CONFLICT (id) DO UPDATE SET
  centroid = EXCLUDED.centroid,
  area_km2 = EXCLUDED.area_km2,
  population = EXCLUDED.population;

-- Insert Sample Critical Infrastructure in Pune
INSERT INTO infrastructure_assets (district_id, asset_type, name, location, criticality) VALUES
('MH_PUNE', 'HOSPITAL', 'Sassoon General Hospital', ST_SetSRID(ST_MakePoint(73.8742, 18.5284), 4326), 'CRITICAL'),
('MH_PUNE', 'HOSPITAL', 'Deenanath Mangeshkar Hospital', ST_SetSRID(ST_MakePoint(73.8291, 18.5015), 4326), 'HIGH'),
('MH_PUNE', 'POWER', 'MSEB 220kV Substation Parvati', ST_SetSRID(ST_MakePoint(73.8475, 18.4960), 4326), 'CRITICAL'),
('MH_PUNE', 'BRIDGE', 'Sangam Bridge Confluence Overpass', ST_SetSRID(ST_MakePoint(73.8640, 18.5320), 4326), 'HIGH'),
('MH_PUNE', 'SCHOOL', 'Fergusson College Campus Shelter', ST_SetSRID(ST_MakePoint(73.8390, 18.5230), 4326), 'MEDIUM')
ON CONFLICT DO NOTHING;
