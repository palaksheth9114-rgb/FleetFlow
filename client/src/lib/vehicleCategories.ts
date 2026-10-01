export const vehicleCategories = {
  'Logistics & Commercial': [
    'Delivery / Cargo Van',
    'Mini Truck (e.g., Tata Ace)',
    'Heavy Freight Truck',
    'Container Truck',
    'Refrigerated Truck'
  ],
  'Two & Three Wheelers': [
    'Scooter / Activa',
    'Electric Delivery Bike',
    'Cargo Auto / Three-Wheeler'
  ],
  'Passenger & Light Vehicles': [
    'Car (Sedan / Hatchback)',
    'SUV / MUV',
    'Bus / Coach',
    'Bicycle'
  ]
};

export const getVehicleCategory = (type: string) => {
  for (const [cat, types] of Object.entries(vehicleCategories)) {
    if (types.includes(type)) return cat;
  }
  return 'Other';
};
