-- ── Seed default solar inventory items ────────────────────────────
-- These are common solar panel system components used by RBSC Solar.
-- Run this once to populate the inventory dropdown in the Dispatch tab.

INSERT INTO public.inventory (name, category, sku, unit, stock, low_stock_threshold, reorder_level, unit_price, is_active)
VALUES
  ('Solar Panel 1kW (Monocrystalline)',   'Solar Panels',  'SP-MONO-1KW',   'pcs',  50,  5,  3,  12000,  TRUE),
  ('Solar Panel 2kW (Monocrystalline)',   'Solar Panels',  'SP-MONO-2KW',   'pcs',  30,  5,  3,  22000,  TRUE),
  ('Solar Panel 5kW (Polycrystalline)',   'Solar Panels',  'SP-POLY-5KW',   'pcs',  20,  3,  2,  45000,  TRUE),
  ('Solar Panel 10kW (Monocrystalline)',  'Solar Panels',  'SP-MONO-10KW',  'pcs',  15,  3,  2,  85000,  TRUE),
  ('Luminous GTI Inverter 1kW',          'Inverters',     'INV-LUM-1KW',   'pcs',  25,  5,  3,  8500,   TRUE),
  ('Luminous GTI Inverter 3kW',          'Inverters',     'INV-LUM-3KW',   'pcs',  20,  5,  3,  18000,  TRUE),
  ('Luminous GTI Inverter 5kW',          'Inverters',     'INV-LUM-5KW',   'pcs',  15,  3,  2,  28000,  TRUE),
  ('Luminous GTI Inverter 10kW',         'Inverters',     'INV-LUM-10KW',  'pcs',  10,  3,  2,  52000,  TRUE),
  ('Luminous Battery 100Ah',             'Batteries',     'BAT-LUM-100AH', 'pcs',  40,  5,  3,  9000,   TRUE),
  ('Luminous Battery 150Ah',             'Batteries',     'BAT-LUM-150AH', 'pcs',  30,  5,  3,  12500,  TRUE),
  ('Luminous Battery 200Ah',             'Batteries',     'BAT-LUM-200AH', 'pcs',  20,  3,  2,  16000,  TRUE),
  ('Apollo Structure 40mm (Set)',        'Structure',     'STR-APL-40MM',  'set',  30,  5,  3,  3500,   TRUE),
  ('Apollo Structure 80mm (Set)',        'Structure',     'STR-APL-80MM',  'set',  25,  5,  3,  4500,   TRUE),
  ('DC Cable 4 Sq MM (per metre)',       'Cables & Wiring','CAB-DC-4MM',   'mtr',  500, 50, 30, 35,     TRUE),
  ('AC Cable 6 Sq MM (per metre)',       'Cables & Wiring','CAB-AC-6MM',   'mtr',  500, 50, 30, 45,     TRUE),
  ('Earthing Kit (3 Sq MM)',             'Cables & Wiring','EARTH-3MM',    'set',  40,  5,  3,  1200,   TRUE),
  ('MC4 Connector Pair',                'Accessories',   'ACC-MC4',       'pair', 200, 20, 10, 120,    TRUE),
  ('Solar Charge Controller 40A',       'Controllers',   'CTRL-40A',      'pcs',  20,  3,  2,  3200,   TRUE),
  ('Net Metering Kit',                  'Accessories',   'ACC-NETMTR',    'set',  15,  3,  2,  4500,   TRUE),
  ('BOS (Balance of System) Kit',       'Accessories',   'ACC-BOS',       'set',  20,  5,  3,  6000,   TRUE),
  ('Mounting Hardware Set',             'Accessories',   'ACC-MNT',       'set',  30,  5,  3,  800,    TRUE),
  ('Junction Box',                      'Accessories',   'ACC-JBOX',      'pcs',  50,  5,  3,  350,    TRUE)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
