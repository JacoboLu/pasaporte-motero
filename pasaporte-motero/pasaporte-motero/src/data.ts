export type Region = { name: string; city: string; places: string[]; visited?: boolean; image: string }

export const regions: Region[] = [
  { name: 'Áncash', city: 'Huaraz', places: ['Huaraz', 'Laguna Llanganuco', 'Laguna Parón', 'Chavín de Huántar', 'Pastoruri'], image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900' },
  { name: 'Cusco', city: 'Cusco', places: ['Machu Picchu', 'Valle Sagrado', 'Montaña de 7 Colores'], image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=900' },
  { name: 'Arequipa', city: 'Arequipa', places: ['Centro Histórico', 'Cañón del Colca', 'Volcán Misti'], image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900' },
  { name: 'Ica', city: 'Ica', places: ['Huacachina', 'Paracas', 'Líneas de Nasca'], image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=900' },
  { name: 'Junín', city: 'Huancayo', places: ['Torre Torre', 'Nevado Huaytapallana', 'Ingenio'], image: 'https://images.unsplash.com/photo-1464278533981-50106e6176b1?w=900' },
  { name: 'Puno', city: 'Puno', places: ['Lago Titicaca', 'Islas Uros', 'Sillustani'], image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=900' },
]

export const allRegions = [
'Amazonas','Áncash','Apurímac','Arequipa','Ayacucho','Cajamarca','Callao','Cusco','Huancavelica','Huánuco','Ica','Junín','La Libertad','Lambayeque','Lima','Loreto','Madre de Dios','Moquegua','Pasco','Piura','Puno','San Martín','Tacna','Tumbes','Ucayali'
]
