import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { BrowserQRCodeReader } from '@zxing/browser'
import {
  Search, MapPin, Compass, BookOpen, Plus, Users, UserRound, ChevronRight,
  Award, Lock, Map, Mountain, Sunrise, Tent, Navigation, CheckCircle2,
  ShieldCheck, Camera, Bike, Bell, Heart, MessageCircle, Share2, Route,
  Images, List as ListIcon, X, LocateFixed, CalendarDays, Bookmark, SlidersHorizontal,
  ArrowLeft, Clock3, Send, ImagePlus, Globe2, Settings, LogOut, QrCode,
  BadgeCheck, AlertCircle, CloudOff, MoreHorizontal, Flag, UserPlus, Stamp,
  MapPinned, Trophy, Sparkles, FileCheck2, ScanLine, Wrench, CalendarClock, FileText, ChevronDown, Sun, Moon
} from 'lucide-react'
import { allRegions, regions } from './data'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { clearPrivateCache, migrateLegacyPrivateCache, readPrivateCache, writePrivateCache } from './lib/secure-storage'

type Tab = 'explore' | 'passport' | 'community' | 'profile'
type VisitStatus = 'validated' | 'pending' | 'rejected'
type Destination = { id: number; title: string; region: string; province: string; city: string; category: string; distance: string; image: string; description: string; lat: number; lng: number; radius: number }
type Post = { id: string | number; title: string; text: string; place: string; date: string; likes: number; liked?: boolean; saved?: boolean; visibility: 'public'|'followers'|'private'; image?: string; comments: string[]; kind?: 'post'|'trip'; tripStops?: string[]; tripPhotos?: string[]; authorName?: string; authorUsername?: string; authorAvatar?: string | null; createdAt?: string }
type Visit = { id: string | number; destinationId: number; date: string; method: 'gps'|'photo'|'qr'; status: VisitStatus; note?: string; image?: string }
type TripStop = { name: string; catalogDestinationId: number | null; sortOrder: number }
type Trip = { id: string; name: string; start: string; end: string; description: string; destinationIds: number[]; stops: TripStop[]; visibility: 'public'|'followers'|'private'; photos: string[] }

const destinations: Destination[] = [
  { id: 1, title: 'Abra Anticona (Ticlio)', region: 'Junín', province: 'Yauli', city: 'Morococha', category: 'Montañas', distance: '124 km', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Uno de los pasos de montaña más emblemáticos de la Carretera Central. Un recorrido de altura entre paisajes andinos.', lat: -11.609, lng: -76.193, radius: 350 },
  { id: 2, title: 'Reserva Nacional de Paracas', region: 'Ica', province: 'Pisco', city: 'Paracas', category: 'Costa', distance: '250 km', image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1100&q=85', description: 'Desierto, mar y acantilados en una de las reservas naturales más reconocidas del litoral peruano.', lat: -13.835, lng: -76.25, radius: 500 },
  { id: 3, title: 'Cañón del Pato', region: 'Áncash', province: 'Huaylas', city: 'Huallanca', category: 'Rutas', distance: '480 km', image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1100&q=85', description: 'Una ruta escénica entre paredes rocosas, túneles y paisajes de la cordillera.', lat: -8.817, lng: -77.87, radius: 500 },
  { id: 4, title: 'Laguna Llanganuco', region: 'Áncash', province: 'Yungay', city: 'Yungay', category: 'Montañas', distance: '—', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1100&q=85', description: 'Lagunas de aguas turquesas rodeadas por nevados dentro del Parque Nacional Huascarán.', lat: -9.064, lng: -77.612, radius: 500 },
  { id: 5, title: 'Torre Torre', region: 'Junín', province: 'Huancayo', city: 'Huancayo', category: 'Naturaleza', distance: '—', image: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1100&q=85', description: 'Formaciones geológicas de arcilla y arena que forman un paisaje singular cerca de Huancayo.', lat: -12.052, lng: -75.205, radius: 300 },
  { id: 6, title: 'Huacachina', region: 'Ica', province: 'Ica', city: 'Ica', category: 'Desierto', distance: '—', image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1100&q=85', description: 'Oasis rodeado de dunas, uno de los paisajes más conocidos del sur peruano.', lat: -14.087, lng: -75.763, radius: 300 },
  // Cusco: catálogo inicial ampliado para pruebas de campo.
  { id: 7, title: 'Plaza de Armas de Cusco', region: 'Cusco', province: 'Cusco', city: 'Cusco', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1100&q=85', description: 'Centro histórico de la ciudad, rodeado de arquitectura inca y colonial.', lat: -13.5167, lng: -71.9786, radius: 250 },
  { id: 8, title: 'Qorikancha', region: 'Cusco', province: 'Cusco', city: 'Cusco', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1100&q=85', description: 'Antiguo templo inca del Sol, integrado al conjunto de Santo Domingo.', lat: -13.5186, lng: -71.9757, radius: 180 },
  { id: 9, title: 'Sacsayhuamán', region: 'Cusco', province: 'Cusco', city: 'Cusco', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1100&q=85', description: 'Parque arqueológico con enormes muros de piedra sobre la ciudad del Cusco.', lat: -13.5087, lng: -71.9824, radius: 350 },
  { id: 10, title: 'Qenqo', region: 'Cusco', province: 'Cusco', city: 'Cusco', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1100&q=85', description: 'Complejo arqueológico ceremonial cercano a Sacsayhuamán.', lat: -13.5080, lng: -71.9700, radius: 180 },
  { id: 11, title: 'Puka Pukara', region: 'Cusco', province: 'Cusco', city: 'Cusco', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1100&q=85', description: 'Sitio arqueológico asociado al sistema de caminos incas.', lat: -13.4847, lng: -71.9674, radius: 180 },
  { id: 12, title: 'Tambomachay', region: 'Cusco', province: 'Cusco', city: 'Cusco', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1100&q=85', description: 'Conjunto arqueológico conocido por sus fuentes y canales de agua.', lat: -13.4786, lng: -71.9726, radius: 180 },
  { id: 13, title: 'Pisac', region: 'Cusco', province: 'Calca', city: 'Pisac', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1100&q=85', description: 'Pueblo del Valle Sagrado y parque arqueológico en la montaña.', lat: -13.4214, lng: -71.8512, radius: 300 },
  { id: 14, title: 'Ollantaytambo', region: 'Cusco', province: 'Urubamba', city: 'Ollantaytambo', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1100&q=85', description: 'Pueblo inca vivo y complejo arqueológico del Valle Sagrado.', lat: -13.2589, lng: -72.2633, radius: 300 },
  { id: 15, title: 'Moray', region: 'Cusco', province: 'Urubamba', city: 'Maras', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1100&q=85', description: 'Andenes circulares incas que forman un singular paisaje agrícola.', lat: -13.3297, lng: -72.1968, radius: 250 },
  { id: 16, title: 'Salineras de Maras', region: 'Cusco', province: 'Urubamba', city: 'Maras', category: 'Naturaleza', distance: '—', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1100&q=85', description: 'Conjunto de pozas de sal en una ladera del Valle Sagrado.', lat: -13.3002, lng: -72.1568, radius: 250 },
  { id: 17, title: 'Chinchero', region: 'Cusco', province: 'Urubamba', city: 'Chinchero', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1100&q=85', description: 'Pueblo andino con restos incas, templo colonial y tradición textil.', lat: -13.3928, lng: -72.0478, radius: 250 },
  { id: 18, title: 'Machu Picchu', region: 'Cusco', province: 'Urubamba', city: 'Machu Picchu', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1100&q=85', description: 'Santuario Histórico y ciudad inca. Requiere planificación y boleto de ingreso.', lat: -13.1631, lng: -72.5450, radius: 400 },
  { id: 19, title: 'Laguna Humantay', region: 'Cusco', province: 'Anta', city: 'Mollepata', category: 'Montañas', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Laguna altoandina al pie de montañas nevadas; acceso mediante caminata.', lat: -13.4208, lng: -72.6867, radius: 350 },
  { id: 20, title: 'Nevado Ausangate', region: 'Cusco', province: 'Quispicanchi', city: 'Ocongate', category: 'Montañas', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Montaña sagrada y zona de trekking de alta montaña.', lat: -13.7875, lng: -71.2300, radius: 600 },
  { id: 21, title: 'Montaña de 7 Colores (Vinicunca)', region: 'Cusco', province: 'Quispicanchi', city: 'Cusipata', category: 'Montañas', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Montaña de colores con acceso por ruta de altura y caminata.', lat: -13.8700, lng: -71.3020, radius: 350 },
  { id: 22, title: 'Palccoyo', region: 'Cusco', province: 'Canchis', city: 'Checacupe', category: 'Montañas', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Cordillera de colores con miradores y caminatas de altura.', lat: -13.8730, lng: -71.2960, radius: 450 },
  { id: 23, title: 'Parque Arqueológico de Raqchi', region: 'Cusco', province: 'Canchis', city: 'San Pedro', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1100&q=85', description: 'Complejo arqueológico donde destaca el templo de Wiracocha.', lat: -14.1760, lng: -71.3670, radius: 250 },
  { id: 24, title: 'Andahuaylillas', region: 'Cusco', province: 'Quispicanchi', city: 'Andahuaylillas', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1100&q=85', description: 'Pueblo conocido por su iglesia histórica, parte de la Ruta del Barroco Andino.', lat: -13.6730, lng: -71.6780, radius: 200 },
  { id: 25, title: 'Tipón', region: 'Cusco', province: 'Quispicanchi', city: 'Oropesa', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1100&q=85', description: 'Complejo arqueológico con terrazas, canales y fuentes de agua.', lat: -13.5650, lng: -71.7770, radius: 250 },
  { id: 26, title: 'Parque Nacional del Manu', region: 'Cusco', province: 'Paucartambo', city: 'Paucartambo', category: 'Naturaleza', distance: '—', image: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1100&q=85', description: 'Área natural protegida de enorme biodiversidad; visitar con operadores autorizados y planificación.', lat: -13.0000, lng: -71.5000, radius: 1500 },
  // Áncash: Huaraz y principales destinos del Callejón de Huaylas.
  { id: 27, title: 'Plaza de Armas de Huaraz', region: 'Áncash', province: 'Huaraz', city: 'Huaraz', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Centro urbano de Huaraz, punto de partida para explorar el Callejón de Huaylas.', lat: -9.5278, lng: -77.5278, radius: 250 },
  { id: 28, title: 'Laguna Parón', region: 'Áncash', province: 'Huaylas', city: 'Caraz', category: 'Montañas', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Gran laguna de color turquesa rodeada por cumbres de la Cordillera Blanca.', lat: -8.9990, lng: -77.6840, radius: 500 },
  { id: 29, title: 'Laguna 69', region: 'Áncash', province: 'Yungay', city: 'Yungay', category: 'Montañas', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Laguna de alta montaña dentro del Parque Nacional Huascarán; requiere trekking exigente.', lat: -9.0100, lng: -77.6060, radius: 350 },
  { id: 30, title: 'Laguna Churup', region: 'Áncash', province: 'Huaraz', city: 'Huaraz', category: 'Montañas', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Laguna de altura accesible mediante caminata desde el sector Pitec.', lat: -9.4890, lng: -77.4060, radius: 350 },
  { id: 31, title: 'Nevado Pastoruri', region: 'Áncash', province: 'Recuay', city: 'Cátac', category: 'Montañas', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Nevado y ruta interpretativa del cambio climático en el Parque Nacional Huascarán.', lat: -9.8880, lng: -77.1780, radius: 500 },
  { id: 32, title: 'Chavín de Huántar', region: 'Áncash', province: 'Huari', city: 'Chavín de Huántar', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1100&q=85', description: 'Monumento arqueológico preincaico declarado Patrimonio Mundial.', lat: -9.5920, lng: -77.1780, radius: 300 },
  { id: 33, title: 'Callejón de Huaylas', region: 'Áncash', province: 'Huaylas', city: 'Caraz', category: 'Rutas', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Corredor escénico entre la Cordillera Blanca y la Cordillera Negra.', lat: -9.0470, lng: -77.8100, radius: 1200 },
  { id: 34, title: 'Caraz', region: 'Áncash', province: 'Huaylas', city: 'Caraz', category: 'Naturaleza', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Ciudad del Callejón de Huaylas, base para visitar la Laguna Parón.', lat: -9.0470, lng: -77.8100, radius: 250 },
  { id: 35, title: 'Carhuaz', region: 'Áncash', province: 'Carhuaz', city: 'Carhuaz', category: 'Naturaleza', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Ciudad tradicional del Callejón de Huaylas con vistas a la Cordillera Blanca.', lat: -9.2810, lng: -77.6450, radius: 250 },
  { id: 36, title: 'Chacas', region: 'Áncash', province: 'Asunción', city: 'Chacas', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Pueblo andino conocido por su patrimonio cultural y tradición artesanal.', lat: -9.1600, lng: -77.3700, radius: 300 },
  { id: 37, title: 'Nevado Alpamayo', region: 'Áncash', province: 'Huaylas', city: 'Santa Cruz', category: 'Montañas', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Cumbre emblemática de la Cordillera Blanca; destino de andinismo técnico.', lat: -8.8800, lng: -77.6530, radius: 1000 },
  { id: 38, title: 'Cordillera Huayhuash', region: 'Áncash', province: 'Bolognesi', city: 'Chiquián', category: 'Montañas', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Circuito de alta montaña remoto; requiere guía, aclimatación y planificación especializada.', lat: -10.2500, lng: -76.9000, radius: 1800 },
  { id: 39, title: 'Piedra de los 12 Ángulos', region: 'Cusco', province: 'Cusco', city: 'Cusco', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Arquitectura inca en Hatunrumiyoc.', lat: -13.5162, lng: -71.9753, radius: 350 },
  { id: 40, title: 'Barrio de San Blas', region: 'Cusco', province: 'Cusco', city: 'Cusco', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Barrio tradicional de talleres artesanales.', lat: -13.514, lng: -71.973, radius: 350 },
  { id: 41, title: 'Mercado de San Pedro', region: 'Cusco', province: 'Cusco', city: 'Cusco', category: 'Cultural', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Mercado tradicional y gastronomía local.', lat: -13.52, lng: -71.982, radius: 350 },
  { id: 42, title: 'Pikillaqta', region: 'Cusco', province: 'Quispicanchi', city: 'Lucre', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Parque arqueológico preincaico del Valle Sur.', lat: -13.6, lng: -71.7167, radius: 350 },
  { id: 43, title: 'Waqrapukara', region: 'Cusco', province: 'Acomayo', city: 'Acopia', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Complejo arqueológico en un promontorio rocoso.', lat: -13.925, lng: -71.675, radius: 350 },
  { id: 44, title: 'Q’eswachaka', region: 'Cusco', province: 'Canas', city: 'Quehue', category: 'Cultural', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Puente colgante tradicional de ichu.', lat: -14.38, lng: -71.485, radius: 350 },
  { id: 45, title: 'Pallay Punchu', region: 'Cusco', province: 'Canas', city: 'Layo', category: 'Montañas', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Montaña de formaciones y colores.', lat: -14.49, lng: -71.15, radius: 350 },
  { id: 46, title: 'Laguna de Pomacanchi', region: 'Cusco', province: 'Acomayo', city: 'Pomacanchi', category: 'Naturaleza', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Laguna altoandina del circuito sur.', lat: -14.03, lng: -71.57, radius: 350 },
  { id: 47, title: 'Laguna de Langui-Layo', region: 'Cusco', province: 'Canas', city: 'Layo', category: 'Naturaleza', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Gran laguna altoandina del sur cusqueño.', lat: -14.49, lng: -71.15, radius: 350 },
  { id: 48, title: 'Huchuy Qosqo', region: 'Cusco', province: 'Calca', city: 'Lamay', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Sitio arqueológico con vistas al Valle Sagrado.', lat: -13.36, lng: -71.945, radius: 350 },
  { id: 49, title: 'Lares', region: 'Cusco', province: 'Calca', city: 'Lares', category: 'Naturaleza', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Valle andino y baños termales.', lat: -13.106, lng: -71.923, radius: 350 },
  { id: 50, title: 'Choquequirao', region: 'Cusco', province: 'La Convención', city: 'Santa Teresa', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Complejo arqueológico remoto de trekking exigente.', lat: -13.395, lng: -72.874, radius: 350 },
  { id: 51, title: 'Ruta Salkantay', region: 'Cusco', province: 'Anta', city: 'Mollepata', category: 'Montañas', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Ruta de montaña hacia el nevado Salkantay.', lat: -13.34, lng: -72.54, radius: 350 },
  { id: 52, title: 'Laguna Wilcacocha', region: 'Áncash', province: 'Huaraz', city: 'Huaraz', category: 'Naturaleza', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Laguna y mirador hacia la Cordillera Blanca.', lat: -9.575, lng: -77.555, radius: 350 },
  { id: 53, title: 'Mirador de Rataquenua', region: 'Áncash', province: 'Huaraz', city: 'Huaraz', category: 'Naturaleza', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Mirador panorámico de Huaraz y las cordilleras.', lat: -9.54, lng: -77.515, radius: 350 },
  { id: 54, title: 'Wilkawain', region: 'Áncash', province: 'Huaraz', city: 'Independencia', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Complejo arqueológico Recuay y Wari.', lat: -9.49, lng: -77.515, radius: 350 },
  { id: 55, title: 'Campo Santo de Yungay', region: 'Áncash', province: 'Yungay', city: 'Yungay', category: 'Histórico', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Memorial de la antigua ciudad de Yungay.', lat: -9.138, lng: -77.745, radius: 350 },
  { id: 56, title: 'Laguna Orconcocha', region: 'Áncash', province: 'Yungay', city: 'Yungay', category: 'Montañas', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Laguna del conjunto de Llanganuco.', lat: -9.075, lng: -77.61, radius: 350 },
  { id: 57, title: 'Laguna Chinancocha', region: 'Áncash', province: 'Yungay', city: 'Yungay', category: 'Montañas', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Laguna principal del conjunto de Llanganuco.', lat: -9.073, lng: -77.61, radius: 350 },
  { id: 58, title: 'Laguna Rocotuyoc', region: 'Áncash', province: 'Huaraz', city: 'Huaraz', category: 'Montañas', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Laguna altoandina de la Cordillera Blanca.', lat: -9.4, lng: -77.4, radius: 350 },
  { id: 59, title: 'Laguna Rajucolta', region: 'Áncash', province: 'Huaraz', city: 'Huaraz', category: 'Montañas', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Laguna glaciar al pie del nevado Huantsán.', lat: -9.56, lng: -77.39, radius: 350 },
  { id: 60, title: 'Nevado Huascarán (sector de acceso)', region: 'Áncash', province: 'Yungay', city: 'Yungay', category: 'Montañas', distance: '—', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Sector de acceso al entorno del nevado; requiere planificación.', lat: -9.12, lng: -77.605, radius: 350 },
]
const categories = ['Todos', 'Montañas', 'Rutas', 'Costa', 'Naturaleza', 'Histórico', 'Cultural', 'Desierto']
const initialPosts: Post[] = [
  { id: 1, title: 'Rumbo a la Cordillera Blanca', text: 'Cada kilómetro es una historia. Próxima parada: Huaraz. Preparando la primera expedición de Pasaporte Motero.', place: 'Áncash, Perú', date: 'Hace 2 h', likes: 24, visibility: 'public', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85', comments: ['¡Qué buena ruta!', 'Comparte el track cuando puedas.'] },
  { id: 2, title: 'Carretera y libertad', text: 'Una parada para disfrutar el paisaje y seguir sumando kilómetros.', place: 'Junín, Perú', date: 'Ayer', likes: 12, visibility: 'public', image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=85', comments: [] },
]
const initialTrips: Trip[] = []

function distanceMeters(a: GeolocationCoordinates, lat: number, lng: number) {
  const rad = (v: number) => v * Math.PI / 180
  const dLat = rad(lat - a.latitude), dLng = rad(lng - a.longitude)
  const x = Math.sin(dLat/2)**2 + Math.cos(rad(a.latitude))*Math.cos(rad(lat))*Math.sin(dLng/2)**2
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x))
}
function initials(name: string) { return name.split(' ').filter(Boolean).slice(0,2).map(x => x[0]).join('').toUpperCase() || 'VM' }

export default function App() {
  const [tab, setTab] = useState<Tab>('explore')
  const [subview, setSubview] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todos')
  const [regionFilter, setRegionFilter] = useState('Todos')
  const [showFilters, setShowFilters] = useState(false)
  const [selected, setSelected] = useState<Destination | null>(null)
  const [showActions, setShowActions] = useState(false)
  const [action, setAction] = useState<'visit'|'trip'|'post'|'memory'|''>('')
  const [visitMethod, setVisitMethod] = useState<'gps'|'photo'|'qr'>('gps')
  const [visitDestination, setVisitDestination] = useState<number>(1)
  const [visits, setVisits] = useState<Visit[]>([])
  const [departmentStamps, setDepartmentStamps] = useState<{department_code:string;earned_at:string}[]>([])
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [trips, setTrips] = useState<Trip[]>(initialTrips)
  const [saved, setSaved] = useState<number[]>([])
  const [displayName, setDisplayName] = useState('Viajero Motero')
  const [username, setUsername] = useState('viajero_motero')
  const [bio, setBio] = useState('Viajando y descubriendo nuevas rutas.')
  const [homeCity, setHomeCity] = useState('Perú')
  const [motorcycleBrand, setMotorcycleBrand] = useState('')
  const [motorcycleModel, setMotorcycleModel] = useState('')
  const [motorcycleYear, setMotorcycleYear] = useState('')
  const [profileBusy, setProfileBusy] = useState(false)
  const [motorcycleId, setMotorcycleId] = useState<string | null>(null)
  const [motorcyclePhoto, setMotorcyclePhoto] = useState('')
  const [motorcyclePhotoFile, setMotorcyclePhotoFile] = useState<File | null>(null)
  const [motorcyclePhotoPreview, setMotorcyclePhotoPreview] = useState('')
  const [motorcycleCropX, setMotorcycleCropX] = useState(50)
  const [motorcycleCropY, setMotorcycleCropY] = useState(50)
  const cropDrag = useRef<{x:number;y:number;cropX:number;cropY:number}|null>(null)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [documentBusy, setDocumentBusy] = useState(false)
  const [motorcycleCc, setMotorcycleCc] = useState('')
  const [motorcycleType, setMotorcycleType] = useState('Adventure')
  const [motorcycleFuel, setMotorcycleFuel] = useState('Gasolina')
  const [motorcycleOdometer, setMotorcycleOdometer] = useState('')
  const [motorcycleNotes, setMotorcycleNotes] = useState('')
  const [motorcycleBusy, setMotorcycleBusy] = useState(false)
  const [maintenance, setMaintenance] = useState<any[]>([])
  const [maintenanceDate, setMaintenanceDate] = useState(new Date().toISOString().slice(0,10))
  const [maintenanceType, setMaintenanceType] = useState('Cambio de aceite')
  const [maintenanceKm, setMaintenanceKm] = useState('')
  const [maintenanceCost, setMaintenanceCost] = useState('')
  const [maintenanceNotes, setMaintenanceNotes] = useState('')
  const [documentType, setDocumentType] = useState('SOAT')
  const [documentExpiry, setDocumentExpiry] = useState('')
  const [documents, setDocuments] = useState<any[]>([])
  const [postTitle, setPostTitle] = useState('')
  const [postText, setPostText] = useState('')
  const [postPlace, setPostPlace] = useState('')
  const [postVisibility, setPostVisibility] = useState<'public'|'followers'|'private'>('public')
  const [postImage, setPostImage] = useState('')
  const [tripName, setTripName] = useState('')
  const [tripStart, setTripStart] = useState(new Date().toISOString().slice(0,10))
  const [tripEnd, setTripEnd] = useState('')
  const [tripDescription, setTripDescription] = useState('')
  const [tripVisibility, setTripVisibility] = useState<'public'|'followers'|'private'>('private')
  const [tripDestinations, setTripDestinations] = useState<number[]>([])
  const [tripStopSelection, setTripStopSelection] = useState('')
  const [tripManualStop, setTripManualStop] = useState('')
  const [tripManualStops, setTripManualStops] = useState<string[]>([])
  const [visitNote, setVisitNote] = useState('')
  const [visitPhoto, setVisitPhoto] = useState('')
  const [qr, setQr] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [feedMode, setFeedMode] = useState<'all'|'following'>('all')
  const [commentPost, setCommentPost] = useState<string | number | null>(null)
  const [commentText, setCommentText] = useState('')
  const [followed, setFollowed] = useState<string[]>([])
  const [qrManual, setQrManual] = useState('')
  const [qrChallengeExpires, setQrChallengeExpires] = useState('')
  const [qrScanning, setQrScanning] = useState(false)
  const qrVideoRef = useRef<HTMLVideoElement | null>(null)
  const qrScannerControls = useRef<{stop:()=>void} | null>(null)
  const [adminMode, setAdminMode] = useState(false)
  const [profileRole, setProfileRole] = useState<'user'|'manager'|'admin'>('user')
  const [adminVisits, setAdminVisits] = useState<any[]>([])
  const [adminBusy, setAdminBusy] = useState(false)
  const [mapMode, setMapMode] = useState(false)
  const [mapDestinations, setMapDestinations] = useState<Destination[]>(destinations)
  const [destinationView, setDestinationView] = useState<'list'|'grid'|'compact'>(() => { try { const saved = localStorage.getItem('pm_destination_view'); return saved === 'list' || saved === 'grid' || saved === 'compact' ? saved : 'list' } catch { return 'list' } })
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login'|'register'>('login')
  const [theme, setTheme] = useState<'dark'|'light'>(() => (localStorage.getItem('pm_theme') as 'dark'|'light') || 'dark')
  const [registerName, setRegisterName] = useState('')
  const [registerUsername, setRegisterUsername] = useState('')
  const [registerCity, setRegisterCity] = useState('')
  const [registerMotorcycle, setRegisterMotorcycle] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authUser, setAuthUser] = useState<string | null>(null)
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [secureCacheReady, setSecureCacheReady] = useState(false)
  const [motorcycleOpen, setMotorcycleOpen] = useState(true)
  const [maintenanceOpen, setMaintenanceOpen] = useState(true)
  const [documentsOpen, setDocumentsOpen] = useState(true)

  useEffect(() => { localStorage.setItem('pm_theme', theme); document.documentElement.dataset.theme = theme; const color = theme === 'light' ? '#f5f6f7' : '#111111'; document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color); document.documentElement.style.backgroundColor = color; document.body.style.backgroundColor = color }, [theme])
  useEffect(() => { try { localStorage.setItem('pm_destination_view', destinationView) } catch { /* La preferencia seguirá activa durante esta sesión */ } }, [destinationView])
  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.from('destination_catalog')
      .select('id,name,department,province,city,category,description,latitude,longitude,geofence_radius_m,image_url')
      .eq('is_active', true)
      .then(({ data, error }) => {
        if (!active) return
        if (error) { console.warn('No se pudo cargar el catálogo de destinos para el mapa:', error.message); return }
        const rows = (data || []).filter((row: any) => Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude))).map((row: any): Destination => ({
          id: Number(row.id), title: row.name, region: row.department || 'Perú', province: row.province || row.department || '', city: row.city || row.province || '',
          category: row.category || 'Destino', distance: '—', image: row.image_url || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85',
          description: row.description || '', lat: Number(row.latitude), lng: Number(row.longitude), radius: Number(row.geofence_radius_m) || 250
        }))
        if (rows.length) setMapDestinations(rows)
      })
    return () => { active = false }
  }, [])
  useEffect(() => {
    let active = true
    const hydratePrivateCache = async () => {
      await migrateLegacyPrivateCache()
      const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
      if (active && !data.session) {
        const [cachedVisits, cachedPosts, cachedTrips, cachedSaved, cachedFollowed, cachedName, cachedUsername, cachedBio, cachedCity] = await Promise.all([
          readPrivateCache<Visit[]>('pm_visits', []),
          readPrivateCache<Post[]>('pm_posts', initialPosts),
          readPrivateCache<Trip[]>('pm_trips', []),
          readPrivateCache<number[]>('pm_saved', []),
          readPrivateCache<string[]>('pm_followed', []),
          readPrivateCache<string>('pm_name', 'Viajero Motero'),
          readPrivateCache<string>('pm_username', 'viajero_motero'),
          readPrivateCache<string>('pm_bio', 'Viajando y descubriendo nuevas rutas.'),
          readPrivateCache<string>('pm_city', 'Perú')
        ])
        if (!active) return
        setVisits(cachedVisits); setPosts(cachedPosts); setTrips(cachedTrips); setSaved(cachedSaved); setFollowed(cachedFollowed)
        setDisplayName(cachedName); setUsername(cachedUsername); setBio(cachedBio); setHomeCity(cachedCity)
      }
      if (active) setSecureCacheReady(true)
    }
    void hydratePrivateCache().catch(error => {
      console.error('No se pudo inicializar la caché privada cifrada:', error)
      if (active) setSecureCacheReady(true)
    })
    return () => { active = false }
  }, [])
  useEffect(() => { if (secureCacheReady && authUserId) void writePrivateCache('pm_visits', visits) }, [secureCacheReady, authUserId, visits])
  useEffect(() => { if (secureCacheReady && authUserId) void writePrivateCache('pm_posts', posts) }, [secureCacheReady, authUserId, posts])
  useEffect(() => { if (secureCacheReady && authUserId) void writePrivateCache('pm_trips', trips) }, [secureCacheReady, authUserId, trips])
  useEffect(() => { if (secureCacheReady && authUserId) void writePrivateCache('pm_saved', saved) }, [secureCacheReady, authUserId, saved])
  useEffect(() => { if (secureCacheReady && authUserId) void writePrivateCache('pm_followed', followed) }, [secureCacheReady, authUserId, followed])
  useEffect(() => {
    if (!secureCacheReady || !authUserId) return
    void writePrivateCache('pm_name', displayName); void writePrivateCache('pm_username', username)
    void writePrivateCache('pm_bio', bio); void writePrivateCache('pm_city', homeCity)
  }, [secureCacheReady, authUserId, displayName, username, bio, homeCity])
  useEffect(() => {
    if (!supabase) return
    let alive = true
    const loadProfile = async (userId: string) => {
      const { data, error } = await supabase!.from('profiles')
        .select('username, full_name, bio, city, avatar_url, motorcycle_brand, motorcycle_model, motorcycle_year, role')
        .eq('id', userId).maybeSingle()
      if (!alive) return
      if (error) { notify('No pudimos cargar tu perfil: ' + error.message); return }
      if (data) {
        setProfileRole(data.role === 'admin' || data.role === 'manager' ? data.role : 'user')
        setUsername(data.username || '')
        setDisplayName(data.full_name || 'Viajero Motero')
        setBio(data.bio || '')
        setHomeCity(data.city || 'Perú')
        setAvatarUrl(data.avatar_url || '')
        setMotorcycleBrand(data.motorcycle_brand || '')
        setMotorcycleModel(data.motorcycle_model || '')
        setMotorcycleYear(data.motorcycle_year ? String(data.motorcycle_year) : '')
        if (data.role === 'admin' || data.role === 'manager') void loadAdminVisits()
      }
    }
    supabase.auth.getSession().then(({data}) => {
      if (!alive) return
      const user = data.session?.user
      setAuthUser(user?.email || null)
      setAuthUserId(user?.id || null)
      if (user) { void loadProfile(user.id); void loadMotorcycle(user.id); void loadTrips(user.id); void loadVisits(user.id); void loadCommunityPosts() } else { void loadCommunityPosts() }
    })
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user.email || null)
      setAuthUserId(session?.user.id || null)
      if (session?.user) { void loadProfile(session.user.id); void loadMotorcycle(session.user.id); void loadTrips(session.user.id); void loadVisits(session.user.id); void loadCommunityPosts() }
      else { resetSignedOutData(); void loadCommunityPosts() }
    })
    return () => { alive = false; subscription.unsubscribe() }
  }, [])
  useEffect(() => { const on = () => setOffline(false); const off = () => setOffline(true); window.addEventListener('online', on); window.addEventListener('offline', off); return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) } }, [])

  const visitedIds = useMemo(() => new Set(visits.filter(v => v.status === 'validated').map(v => v.destinationId)), [visits])
  const visitedCount = authUserId ? visitedIds.size : 0
  const visitedRegionCount = authUserId ? departmentStamps.length : 0
  const progress = Math.round(visitedRegionCount / 25 * 100)
  const filteredDestinations = destinations.filter(d => (category === 'Todos' || d.category === category) && (regionFilter === 'Todos' || d.region === regionFilter) && `${d.title} ${d.region} ${d.province} ${d.city}`.toLowerCase().includes(query.toLowerCase()))
  const filteredMapDestinations = mapDestinations.filter(d => (category === 'Todos' || d.category === category) && (regionFilter === 'Todos' || d.region === regionFilter) && `${d.title} ${d.region} ${d.province} ${d.city}`.toLowerCase().includes(query.toLowerCase()))
  const visiblePosts = posts.filter(p => p.visibility !== 'private').filter(p => feedMode === 'all' || followed.length === 0 || followed.includes('motero_viajero'))

  function openTab(next: Tab) { setSubview(''); setSelected(null); setTab(next) }
  function formatDisplayDate(value: string) {
    if (!value) return 'Sin fecha'
    const [year, month, day] = value.slice(0,10).split('-').map(Number)
    if (!year || !month || !day) return 'Sin fecha'
    return new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,day)))
  }
  function startMotorcycleCrop(event: import('react').PointerEvent<HTMLDivElement>) {
    if (!motorcyclePhotoFile) return
    event.currentTarget.setPointerCapture(event.pointerId)
    cropDrag.current={x:event.clientX,y:event.clientY,cropX:motorcycleCropX,cropY:motorcycleCropY}
  }
  function moveMotorcycleCrop(event: import('react').PointerEvent<HTMLDivElement>) {
    const start=cropDrag.current; if(!start)return
    const rect=event.currentTarget.getBoundingClientRect()
    setMotorcycleCropX(Math.max(0,Math.min(100,start.cropX-(event.clientX-start.x)/rect.width*100)))
    setMotorcycleCropY(Math.max(0,Math.min(100,start.cropY-(event.clientY-start.y)/rect.height*100)))
  }
  function endMotorcycleCrop(){cropDrag.current=null}
  function notify(message: string) { setNotice(message); window.setTimeout(() => setNotice(''), 4200) }
  function resetSignedOutData() {
    void clearPrivateCache()
    ;['pm_name','pm_username','pm_bio','pm_city','pm_visits','pm_posts','pm_trips','pm_saved','pm_followed'].forEach(key => localStorage.removeItem(key))
    setDisplayName('Viajero Motero'); setUsername('viajero_motero'); setBio(''); setHomeCity('Perú')
    setVisits([]); setDepartmentStamps([]); setPosts([]); setTrips([]); setSaved([]); setFollowed([])
    setMotorcycleBrand(''); setMotorcycleModel(''); setMotorcycleYear(''); setMotorcycleId(null)
    setAvatarUrl(''); setAvatarFile(null); setDocumentFile(null)
    setMotorcyclePhoto(''); setMotorcyclePhotoFile(null); setMotorcyclePhotoPreview('')
    setMotorcycleCc(''); setMotorcycleType('Adventure'); setMotorcycleFuel('Gasolina')
    setMotorcycleOdometer(''); setMotorcycleNotes(''); setMaintenance([]); setDocuments([])
    setQr(''); setQrChallengeExpires(''); setAdminMode(false); setProfileRole('user'); setAdminVisits([]); setAuthUser(null); setAuthUserId(null)
    setSubview(''); setSelected(null); setAction(''); setShowActions(false); setTab('profile')
  }
  function closeModal() { qrScannerControls.current?.stop(); qrScannerControls.current = null; setQrScanning(false); setAction(''); setVisitPhoto(''); setVisitNote(''); setPostImage(''); setCommentPost(null) }
  function fileToData(file?: File) { if (!file) return; if (file.size > 2_500_000) { notify('La imagen supera 2.5 MB. Selecciona una más ligera.'); return } const reader = new FileReader(); reader.onload = () => setVisitPhoto(String(reader.result || '')); reader.readAsDataURL(file) }
  async function postFileToData(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) { notify('Selecciona una imagen JPG, PNG o WebP.'); return }
    if (file.size <= 2_500_000) {
      const reader = new FileReader()
      reader.onload = () => setPostImage(String(reader.result || ''))
      reader.readAsDataURL(file)
      return
    }
    try {
      const sourceUrl = URL.createObjectURL(file)
      const image = new Image()
      image.src = sourceUrl
      await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('No se pudo leer la imagen'))})
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, 2200 / Math.max(image.naturalWidth,image.naturalHeight))
      canvas.width = Math.round(image.naturalWidth * scale)
      canvas.height = Math.round(image.naturalHeight * scale)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('No se pudo preparar la imagen')
      context.drawImage(image,0,0,canvas.width,canvas.height)
      URL.revokeObjectURL(sourceUrl)
      let quality = 0.88
      let blob: Blob | null = await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality))
      while (blob && blob.size > 2_400_000 && quality > 0.48) {
        quality -= 0.1
        blob = await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality))
      }
      if (!blob || blob.size > 2_500_000) { notify('No fue posible reducir la imagen a 2.5 MB. Prueba con otra fotografía.'); return }
      const before=(file.size/1024/1024).toFixed(2), after=(blob.size/1024/1024).toFixed(2)
      if (!window.confirm(`La fotografía pesa ${before} MB. Podemos comprimirla automáticamente a ${after} MB para publicarla. ¿Aceptas la compresión?`)) { notify('No se aplicó compresión. Elige otra fotografía si deseas continuar.'); return }
      const reader = new FileReader()
      reader.onload = () => { setPostImage(String(reader.result || '')); notify(`Imagen comprimida: ${before} MB → ${after} MB.`) }
      reader.readAsDataURL(blob)
    } catch { notify('No se pudo comprimir esta fotografía. Prueba con otra imagen.') }
  }

  async function makePersonalQr() {
    const user = await getCurrentAuthUser()
    if (!supabase || !user) { setAuthMode('login'); setAuthOpen(true); notify('Inicia sesión para generar tu QR personal.'); return }
    const { data, error } = await supabase.functions.invoke('get-personal-qr', { body: {} })
    if (error || !data?.code) { notify('No se pudo obtener tu identificador QR: ' + (data?.error || error?.message || 'Error')); return }
    try {
      setQrChallengeExpires('')
      const payload = JSON.stringify({ type: 'pasaporte-motero-user', code: data.code })
      setQr(await QRCode.toDataURL(payload, { width: 260, margin: 2, errorCorrectionLevel: 'M' }))
      notify('QR de identificación generado. No concede sellos ni autoriza visitas por sí solo.')
    } catch { notify('No se pudo generar el QR.') }
  }

  async function createVisitQr(destinationId: number) {
    const user = await getCurrentAuthUser()
    if (!supabase || !user) { notify('Inicia sesión con una cuenta de encargado.'); return }
    setAdminBusy(true)
    const { data, error } = await supabase.functions.invoke('create-visit-qr', { body: { destination_id: destinationId } })
    setAdminBusy(false)
    if (error || !data?.token) { notify('No se pudo generar el QR: ' + (data?.error || error?.message || 'Error')); return }
    const payload = JSON.stringify({ type: 'pasaporte-motero-visit', token: data.token })
    try {
      setQr(await QRCode.toDataURL(payload, { width: 280, margin: 2, errorCorrectionLevel: 'Q' }))
      setQrChallengeExpires(data.expires_at)
      notify('QR presencial generado. Es válido por 2 minutos y admite un solo uso.')
    } catch { notify('No se pudo generar la imagen QR.') }
  }

  async function stopQrScanner() {
    qrScannerControls.current?.stop()
    qrScannerControls.current = null
    setQrScanning(false)
  }

  async function startQrScanner() {
    if (!qrVideoRef.current) { notify('No se pudo iniciar la cámara.'); return }
    try {
      setQrScanning(true)
      const reader = new BrowserQRCodeReader()
      qrScannerControls.current = await reader.decodeFromVideoDevice(undefined, qrVideoRef.current, (result) => {
        if (!result) return
        const raw = result.getText()
        qrScannerControls.current?.stop()
        qrScannerControls.current = null
        setQrScanning(false)
        setQrManual(raw)
        notify('QR detectado. Elige la acción de validación correspondiente.')
      })
    } catch (error: any) {
      setQrScanning(false)
      notify('No pudimos abrir la cámara. Verifica el permiso del navegador: ' + (error?.message || 'Error'))
    }
  }

  async function validateRiderQr() {
    const user = await getCurrentAuthUser()
    if (!supabase || !user) { setAuthMode('login'); setAuthOpen(true); notify('Inicia sesión con una cuenta autorizada.'); return }
    if (!qrManual.trim()) { notify('Escanea el QR personal del viajero.'); return }
    setAdminBusy(true)
    const { data, error } = await supabase.functions.invoke('validate-rider-qr', { body: { code: qrManual.trim(), destination_id: visitDestination } })
    setAdminBusy(false)
    if (error || !data?.ok) { notify('No se pudo validar al viajero: '+(data?.error || error?.message || 'Error')); return }
    setQrManual('')
    await loadAdminVisits()
    notify('Visita validada presencialmente. El sello se ha registrado en el pasaporte del viajero.')
  }

  async function submitQrCode() {
    const raw = qrManual.trim()
    if (!raw) { notify('Escanea el QR del establecimiento y pega aquí su contenido.'); return }
    const user = await getCurrentAuthUser()
    if (!supabase || !user) { setAuthMode('login'); setAuthOpen(true); notify('Inicia sesión para validar una visita.'); return }
    let token = raw
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.type !== 'pasaporte-motero-visit') throw new Error('QR no válido para visitas')
      token = String(parsed.token || '')
    } catch (error) {
      if (error instanceof SyntaxError) {
        const match = raw.match(/(?:PMVISIT:)?([a-f0-9]{64})/i)
        token = match?.[1] || raw
      } else { notify('Este QR no corresponde a una validación de visita.'); return }
    }
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('redeem-visit-qr', { body: { token } })
    setBusy(false)
    if (error || !data?.visit) { notify('No se pudo validar el QR: ' + (data?.error || error?.message || 'Código vencido o utilizado')); return }
    setVisitDestination(Number(data.visit.destination_id))
    await loadVisits(user.id)
    setQrManual('')
    notify('QR verificado. Tu visita quedó pendiente de aprobación para obtener el sello.')
    closeModal(); setTab('passport')
  }

  async function validateGps() {
    const dest = destinations.find(d => d.id === visitDestination)
    if (!dest) return
    const user = await getCurrentAuthUser()
    if (!supabase || !user) { setAuthMode('login'); setAuthOpen(true); notify('Inicia sesión para registrar visitas sincronizadas.'); return }
    if (!navigator.geolocation) { notify('Este dispositivo no ofrece geolocalización. Puedes enviar evidencia fotográfica.'); return }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(async position => {
      const meters = distanceMeters(position.coords, dest.lat, dest.lng)
      if (meters > dest.radius) {
        setBusy(false)
        notify(`Estás aproximadamente a ${(meters/1000).toFixed(1)} km de ${dest.title}. Puedes enviar una evidencia fotográfica.`)
        setVisitMethod('photo')
        return
      }
      const { data: result, error } = await supabase!.functions.invoke('validate-gps-visit', {
        body: {
          destination_id: dest.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          notes: visitNote.trim() || null
        }
      })
      setBusy(false)
      if (error || !result?.visit) { notify('No se pudo validar la ubicación: ' + (result?.error || error?.message || 'Error desconocido')); return }
      await loadVisits(user.id)
      notify('Ubicación verificada dentro del radio del destino. La visita quedó pendiente de aprobación para obtener el sello.')
      closeModal(); setTab('passport')
    }, error => {
      setBusy(false)
      notify(error.code === 1 ? 'Permiso de ubicación denegado. Actívalo en tu navegador o utiliza fotografía.' : 'No pudimos obtener tu ubicación. Intenta nuevamente o utiliza fotografía.')
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 })
  }

  async function submitPhotoVisit() {
    if (!visitPhoto) { notify('Adjunta una fotografía para continuar.'); return }
    const user = await getCurrentAuthUser()
    if (!supabase || !user) { setAuthMode('login'); setAuthOpen(true); notify('Inicia sesión para enviar evidencia sincronizada.'); return }
    const dest = destinations.find(d => d.id === visitDestination)
    if (!dest) return
    setBusy(true)
    try {
      const blob = await (await fetch(visitPhoto)).blob()
      const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
      const path = user.id + '/visits/' + crypto.randomUUID() + '.' + ext
      const { error: uploadError } = await supabase.storage.from('travel-media').upload(path, blob, { contentType: blob.type, upsert: false })
      if (uploadError) throw uploadError
      const { error } = await supabase.from('app_visits').insert({
        user_id: user.id, destination_id: dest.id, visited_at: new Date().toISOString(),
        validation_method: 'photo', validation_status: 'pending', notes: visitNote.trim() || null, evidence_path: path
      })
      if (error) {
        await supabase.storage.from('travel-media').remove([path])
        throw error
      }
      await loadVisits(user.id)
      setBusy(false)
      notify('Evidencia enviada y sincronizada. El sello quedará pendiente hasta su revisión.')
      closeModal()
    } catch (err: any) {
      setBusy(false)
      notify('No se pudo enviar la evidencia: ' + (err?.message || 'Error desconocido'))
    }
  }

  async function loadAdminVisits() {
    if (!supabase) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setAdminBusy(true)
    const { data, error } = await supabase.functions.invoke('review-app-visit', { method: 'GET' })
    setAdminBusy(false)
    if (error || !data?.visits) { notify('No se pudieron cargar las validaciones: ' + (data?.error || error?.message || 'Error')); return }
    setAdminVisits(data.visits)
  }

  async function reviewVisit(visitId: string, decision: 'validated'|'rejected') {
    let reason = ''
    if (decision === 'rejected') {
      reason = window.prompt('Indica el motivo del rechazo:')?.trim() || ''
      if (!reason) { notify('Debes indicar el motivo para rechazar la visita.'); return }
    }
    setAdminBusy(true)
    const { data, error } = await supabase!.functions.invoke('review-app-visit', {
      body: { visit_id: visitId, decision, rejection_reason: reason || undefined }
    })
    setAdminBusy(false)
    if (error || !data?.visit) { notify('No se pudo procesar la revisión: ' + (data?.error || error?.message || 'Error')); return }
    setAdminVisits(items => items.filter(item => item.id !== visitId))
    if (authUserId) await loadVisits(authUserId)
    notify(decision === 'validated' ? 'Visita aprobada. El sello ya figura en el pasaporte.' : 'Visita rechazada. Se guardó el motivo.')
  }

  async function loadVisits(userId: string) {
    if (!supabase) return
    const { data, error } = await supabase.from('app_visits')
      .select('id,destination_id,visited_at,validation_method,validation_status,notes,evidence_path')
      .eq('user_id', userId).order('visited_at', { ascending: false })
    if (error) { notify('No pudimos cargar tu pasaporte: ' + error.message); return }
    const rows: Visit[] = (data || []).map((row: any) => {
      let image: string | undefined
      return {
        id: row.id, destinationId: Number(row.destination_id), date: row.visited_at,
        method: row.validation_method, status: row.validation_status,
        note: row.notes || undefined, image
      }
    })
    const withImages = await Promise.all(rows.map(async (visit, index) => {
      const path = data?.[index]?.evidence_path
      if (!path) return visit
      const { data: signed } = await supabase!.storage.from('travel-media').createSignedUrl(path, 3600)
      return { ...visit, image: signed?.signedUrl || undefined }
    }))
    setVisits(withImages)
    const { data: earnedDepartments, error: stampsError } = await supabase
      .from('passport_department_stamps').select('department_code,earned_at').eq('user_id', userId)
    if (stampsError) { notify('No pudimos cargar los sellos departamentales: ' + stampsError.message); return }
    setDepartmentStamps(earnedDepartments || [])
  }

  async function loadCommunityPosts() {
    if (!supabase) return
    const [{ data: postRows, error: postsError }, { data: tripRows, error: tripsError }] = await Promise.all([
      supabase.from('posts').select('id,user_id,title,content,visibility,status,created_at,post_photos(storage_path)').eq('status','published').order('created_at',{ascending:false}).limit(50),
      supabase.from('trips').select('id,user_id,name,description,start_date,end_date,visibility,created_at,trip_photos(storage_path),trip_custom_stops(name,sort_order)').eq('visibility','public').order('created_at',{ascending:false}).limit(50)
    ])
    if (postsError) { notify('No pudimos cargar las publicaciones: '+postsError.message); return }
    if (tripsError) { notify('No pudimos cargar las bitácoras públicas: '+tripsError.message); return }
    const userIds=[...new Set([...(postRows || []).map((row:any)=>row.user_id),...(tripRows || []).map((row:any)=>row.user_id)])]
    const {data:profiles}=userIds.length ? await supabase.from('profiles').select('id,username,full_name,avatar_url').in('id',userIds) : {data:[] as any[]}
    const profileById = new globalThis.Map<string, any>((profiles || []).map((profile: any): [string, any] => [profile.id, profile]))
    const postIds = (postRows || []).map((row: any) => row.id)
    const [{ data: likeRows }, { data: commentRows }, { data: sessionData }] = await Promise.all([
      postIds.length ? supabase.from('post_likes').select('post_id,user_id').in('post_id', postIds) : Promise.resolve({ data: [] as any[] }),
      postIds.length ? supabase.from('comments').select('post_id,content,created_at').in('post_id', postIds).order('created_at') : Promise.resolve({ data: [] as any[] }),
      supabase.auth.getUser()
    ])
    const currentUserId = sessionData.user?.id
    const posts = await Promise.all((postRows || []).map(async (row:any) => {
      const photo = row.post_photos?.[0]?.storage_path
      let image: string | undefined
      if (photo) { const {data:signed} = await supabase!.storage.from('community').createSignedUrl(photo,3600); image=signed?.signedUrl || undefined }
      const profile = profileById.get(row.user_id)
      const likesForPost = (likeRows || []).filter((item: any) => item.post_id === row.id)
      const commentsForPost = (commentRows || []).filter((item: any) => item.post_id === row.id).map((item: any) => item.content)
      return {id:row.id,title:row.title || 'Una nueva aventura',text:row.content,place:'Comunidad motera',date:new Intl.DateTimeFormat('es-PE',{dateStyle:'medium'}).format(new Date(row.created_at)),likes:likesForPost.length,liked:!!currentUserId && likesForPost.some((item:any)=>item.user_id===currentUserId),visibility:row.visibility,image,comments:commentsForPost,kind:'post',authorName:profile?.full_name || 'Motero',authorUsername:profile?.username || 'viajero',authorAvatar:profile?.avatar_url || null,createdAt:row.created_at} as Post
    }))
    const publicTrips = await Promise.all((tripRows || []).map(async (row:any) => {
      const profile = profileById.get(row.user_id)
      const photoPaths = (row.trip_photos || []).map((photo:any)=>photo.storage_path).filter(Boolean)
      const tripPhotos = await Promise.all(photoPaths.map(async (path:string) => {
        const {data:signed} = await supabase!.storage.from('travel-media').createSignedUrl(path,3600)
        return signed?.signedUrl || ''
      }))
      const stops = (row.trip_custom_stops || []).sort((a:any,b:any)=>a.sort_order-b.sort_order).map((stop:any)=>stop.name)
      const date = row.start_date ? new Intl.DateTimeFormat('es-PE',{dateStyle:'medium'}).format(new Date(row.start_date+'T12:00:00')) : new Intl.DateTimeFormat('es-PE',{dateStyle:'medium'}).format(new Date(row.created_at))
      return {id:'trip:'+row.id,title:row.name,text:row.description || 'Una nueva bitácora de viaje compartida con la comunidad.',place:stops.join(' · ') || 'Ruta motera',date,likes:0,visibility:row.visibility,image:tripPhotos.find(Boolean),tripPhotos:tripPhotos.filter(Boolean),tripStops:stops,comments:[],kind:'trip',authorName:profile?.full_name || 'Motero',authorUsername:profile?.username || 'viajero',authorAvatar:profile?.avatar_url || null,createdAt:row.created_at} as Post
    }))
    setPosts([...posts,...publicTrips].sort((a,b)=>new Date(b.createdAt || 0).getTime()-new Date(a.createdAt || 0).getTime()))
  }
  async function publishPost() {
    if (!postText.trim()) { notify('Escribe algo sobre tu aventura antes de publicar.'); return }
    const user = await getCurrentAuthUser()
    if (!supabase || !user) { setAuthMode('login'); setAuthOpen(true); notify('Inicia sesión para publicar en la comunidad.'); return }
    setBusy(true)
    const {data:post,error} = await supabase.from('posts').insert({user_id:user.id,title:postTitle.trim() || 'Una nueva aventura',content:postText.trim(),visibility:postVisibility}).select('id').single()
    if (error || !post) { setBusy(false); notify('No se pudo publicar: '+(error?.message || 'No se recibió confirmación')); return }
    if (postImage) {
      try {
        const blob = await (await fetch(postImage)).blob()
        const ext = blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg'
        const path = user.id+'/'+post.id+'/'+crypto.randomUUID()+'.'+ext
        const {error:uploadError} = await supabase.storage.from('community').upload(path,blob,{contentType:blob.type,upsert:false})
        if (uploadError) throw uploadError
        const {error:photoError} = await supabase.from('post_photos').insert({post_id:post.id,user_id:user.id,storage_path:path})
        if (photoError) { await supabase.storage.from('community').remove([path]); throw photoError }
      } catch (err:any) {
        await supabase.from('posts').delete().eq('id',post.id)
        setBusy(false); notify('No se pudo guardar la fotografía: '+(err?.message || 'Error de almacenamiento')); return
      }
    }
    setBusy(false); setPostTitle(''); setPostText(''); setPostPlace(''); setPostImage(''); setAction(''); setTab('community')
    await loadCommunityPosts()
    if (authUserId) await loadGallery(authUserId)
    notify(postVisibility==='public'?'Publicación publicada en la comunidad.':'Publicación guardada con la privacidad seleccionada.')
  }
  async function createTrip() {
    if (!tripName.trim()) { notify('Escribe un nombre para tu viaje.'); return }
    const user = await getCurrentAuthUser()
    if (!supabase || !user) { setAuthMode('login'); setAuthOpen(true); notify('Inicia sesión para sincronizar tus viajes.'); return }
    if (tripEnd && tripEnd < tripStart) { notify('La fecha de fin no puede ser anterior al inicio.'); return }
    setBusy(true)
    const { data, error } = await supabase.from('trips').insert({ user_id: user.id, name: tripName.trim(), description: tripDescription.trim() || null, start_date: tripStart || null, end_date: tripEnd || null, visibility: tripVisibility }).select('id,name,description,start_date,end_date,visibility').single()
    setBusy(false)
    if (error) { notify('No se pudo crear el viaje: ' + error.message); return }
    const allStops=[
      ...tripDestinations.map((id,index)=>({trip_id:data.id,user_id:user.id,name:destinations.find(d=>d.id===id)?.title || 'Destino',catalog_destination_id:id,sort_order:index})),
      ...tripManualStops.map((name,index)=>({trip_id:data.id,user_id:user.id,name,catalog_destination_id:null,sort_order:tripDestinations.length+index}))
    ]
    if (allStops.length) {
      const {error:stopsError}=await supabase.from('trip_custom_stops').insert(allStops)
      if (stopsError) { await supabase.from('trips').delete().eq('id',data.id); setBusy(false); notify('No se pudieron guardar las paradas. Ejecuta la migración 0003 y vuelve a intentarlo.'); return }
    }
    const newTrip: Trip = { id: data.id, name: data.name, start: data.start_date || '', end: data.end_date || '', description: data.description || '', destinationIds: tripDestinations, stops: allStops.map((stop:any)=>({name:stop.name,catalogDestinationId:stop.catalog_destination_id,sortOrder:stop.sort_order})), visibility: data.visibility, photos: [] }
    setTrips(items => [newTrip, ...items])
    setTripName(''); setTripDescription(''); setTripDestinations([]); setTripManualStops([]); setTripStopSelection(''); setTripManualStop(''); setAction(''); setTab('profile'); setSubview('trips')
    notify('Viaje creado y sincronizado con tu cuenta.')
  }
  async function toggleLike(id: string | number) {
    const user = await getCurrentAuthUser()
    if (!supabase || !user) { setAuthMode('login'); setAuthOpen(true); notify('Inicia sesión para indicar que te gusta una publicación.'); return }
    const post = posts.find(item => item.id === id)
    if (!post) return
    if (post.liked) {
      const { error } = await supabase.from('post_likes').delete().eq('post_id', id).eq('user_id', user.id)
      if (error) { notify('No se pudo quitar el Me gusta: ' + error.message); return }
    } else {
      const { error } = await supabase.from('post_likes').insert({ post_id: id, user_id: user.id })
      if (error && error.code !== '23505') { notify('No se pudo registrar el Me gusta: ' + error.message); return }
    }
    setPosts(items => items.map(item => item.id === id ? { ...item, liked: !post.liked, likes: Math.max(0, item.likes + (post.liked ? -1 : 1)) } : item))
  }
  async function addComment() {
    if (commentPost === null || !commentText.trim()) return
    const user = await getCurrentAuthUser()
    if (!supabase || !user) { setAuthMode('login'); setAuthOpen(true); notify('Inicia sesión para comentar.'); return }
    const { error } = await supabase.from('comments').insert({ post_id: commentPost, user_id: user.id, content: commentText.trim() })
    if (error) { notify('No se pudo publicar el comentario: ' + error.message); return }
    setPosts(items => items.map(item => item.id === commentPost ? { ...item, comments: [...item.comments, commentText.trim()] } : item))
    setCommentText(''); setCommentPost(null); notify('Comentario publicado en la comunidad.')
  }
  function toggleSaved(id: number) { setSaved(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]); notify(saved.includes(id) ? 'Destino eliminado de guardados.' : 'Destino guardado para después.') }
  function openAction(which: 'visit'|'trip'|'post'|'memory') { setShowActions(false); setAction(which); if (which === 'visit') setVisitDestination(selected?.id || destinations[0].id) }
  function createMemory() { setAction('post'); setPostTitle('Un recuerdo de viaje'); setPostVisibility('private') }

  async function loadSocialData(userId: string) {
    if (!supabase) return
    const [{data:following,error:followError},{data:postSaves,error:postSaveError},{data:tripSaves,error:tripSaveError}] = await Promise.all([
      supabase.from('follows').select('following_id').eq('follower_id',userId),
      supabase.from('saved_posts').select('post_id').eq('user_id',userId),
      supabase.from('saved_trips').select('trip_id').eq('user_id',userId)
    ])
    if (followError) console.warn('No se pudieron cargar los seguidos:',followError.message)
    if (postSaveError) console.warn('No se pudieron cargar los favoritos:',postSaveError.message)
    if (tripSaveError) console.warn('No se pudieron cargar los viajes guardados:',tripSaveError.message)
    setFollowed((following || []).map((row:any)=>row.following_id))
    setSavedPostIds((postSaves || []).map((row:any)=>row.post_id))
    setSavedTripIds((tripSaves || []).map((row:any)=>row.trip_id))
  }

  async function loadGallery(userId: string) {
    if (!supabase) return
    setGalleryBusy(true)
    const [{data:postPhotos},{data:tripPhotos},{data:visitRows}] = await Promise.all([
      supabase.from('post_photos').select('id,post_id,storage_path,created_at').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('trip_photos').select('id,trip_id,storage_path,created_at').eq('user_id',userId).order('created_at',{ascending:false}),
      supabase.from('app_visits').select('id,evidence_path,visited_at,validation_status').eq('user_id',userId).not('evidence_path','is',null).order('visited_at',{ascending:false})
    ])
    const items:any[] = []
    for (const row of postPhotos || []) {
      const {data:signed} = await supabase.storage.from('community').createSignedUrl(row.storage_path,3600)
      if (signed?.signedUrl) items.push({id:'post:'+row.id,rowId:row.id,source:'post',bucket:'community',path:row.storage_path,url:signed.signedUrl,createdAt:row.created_at})
    }
    for (const row of tripPhotos || []) {
      const {data:signed} = await supabase.storage.from('travel-media').createSignedUrl(row.storage_path,3600)
      if (signed?.signedUrl) items.push({id:'trip:'+row.id,rowId:row.id,source:'trip',bucket:'travel-media',path:row.storage_path,url:signed.signedUrl,createdAt:row.created_at})
    }
    for (const row of visitRows || []) {
      const {data:signed} = await supabase.storage.from('visit-evidence').createSignedUrl(row.evidence_path,3600)
      if (signed?.signedUrl) items.push({id:'visit:'+row.id,rowId:row.id,source:'visit',bucket:'visit-evidence',path:row.evidence_path,url:signed.signedUrl,createdAt:row.visited_at,locked:row.validation_status==='validated'})
    }
    items.sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime())
    setGalleryItems(items)
    setGalleryBusy(false)
  }

  async function deleteGalleryImage(item:any) {
    if (!supabase) return
    const user=await getCurrentAuthUser()
    if (!user) { notify('Inicia sesión para eliminar fotografías.'); return }
    if (item.locked) { notify('La evidencia de una visita validada se conserva como respaldo del sello.'); return }
    if (!window.confirm('¿Eliminar esta fotografía de tu galería? Esta acción no se puede deshacer.')) return
    setGalleryBusy(true)
    const {error:storageError}=await supabase.storage.from(item.bucket).remove([item.path])
    if (storageError) { setGalleryBusy(false); notify('No se pudo eliminar el archivo: '+storageError.message); return }
    let result:any
    if (item.source==='post') result=await supabase.from('post_photos').delete().eq('id',item.rowId).eq('user_id',user.id)
    else if (item.source==='trip') result=await supabase.from('trip_photos').delete().eq('id',item.rowId).eq('user_id',user.id)
    else result=await supabase.from('app_visits').update({evidence_path:null}).eq('id',item.rowId).eq('user_id',user.id)
    setGalleryBusy(false)
    if (result?.error) { notify('La imagen se eliminó del almacenamiento, pero no se pudo actualizar su registro: '+result.error.message); return }
    setGalleryItems(items=>items.filter(x=>x.id!==item.id))
    notify('Fotografía eliminada de tu galería.')
  }

  async function searchCommunityUsers() {
    if (!supabase) return
    const term=communitySearch.trim().replace(/[,%()]/g,' ')
    if (term.length<2) { notify('Escribe al menos 2 caracteres para buscar viajeros.'); return }
    setSearchingUsers(true)
    const {data,error}=await supabase.from('profiles').select('id,username,full_name,avatar_url,city,bio,motorcycle_brand,motorcycle_model,motorcycle_year').or('username.ilike.%'+term+'%,full_name.ilike.%'+term+'%,city.ilike.%'+term+'%').neq('id',authUserId || '').limit(20)
    setSearchingUsers(false)
    if (error) { notify('No se pudo buscar viajeros: '+error.message); return }
    setCommunityUsers(data || [])
    if (!data?.length) notify('No encontramos viajeros con ese nombre. Prueba con su usuario.')
  }

  async function followUser(profile:any) {
    const user=await getCurrentAuthUser()
    if (!supabase || !user) { setAuthMode('login'); setAuthOpen(true); notify('Inicia sesión para seguir viajeros.'); return }
    const isFollowing=followed.includes(profile.id)
    const result=isFollowing
      ? await supabase.from('follows').delete().eq('follower_id',user.id).eq('following_id',profile.id)
      : await supabase.from('follows').insert({follower_id:user.id,following_id:profile.id})
    if (result.error && result.error.code!=='23505') { notify('No se pudo actualizar el seguimiento: '+result.error.message); return }
    setFollowed(items=>isFollowing?items.filter(id=>id!==profile.id):[...items,profile.id])
    notify(isFollowing?'Dejaste de seguir a @'+(profile.username || 'viajero'):'Ahora sigues a @'+(profile.username || 'viajero'))
  }

  async function openPublicProfile(profile:any) {
    setSelectedPublicProfile(profile)
    setSubview('public-profile')
    setPublicProfileBusy(true)
    if (supabase) {
      const {data,error}=await supabase.from('profiles').select('id,username,full_name,avatar_url,bio,city,country,motorcycle_brand,motorcycle_model,motorcycle_year,created_at').eq('id',profile.id).maybeSingle()
      if (!error && data) setSelectedPublicProfile(data)
      else if (error) console.warn('No se pudo cargar el perfil público:',error.message)
    }
    setPublicProfileBusy(false)
  }

  async function toggleCommunitySaved(post:Post) {
    const user=await getCurrentAuthUser()
    if (!supabase || !user) { setAuthMode('login'); setAuthOpen(true); notify('Inicia sesión para guardar favoritos entre dispositivos.'); return }
    const isTrip=post.kind==='trip'
    const id=String(post.id).replace(/^trip:/,'')
    const current=isTrip?savedTripIds:savedPostIds
    const table=isTrip?'saved_trips':'saved_posts'
    const key=isTrip?'trip_id':'post_id'
    const result=current.includes(id)
      ? await supabase.from(table).delete().eq('user_id',user.id).eq(key,id)
      : await supabase.from(table).insert({user_id:user.id,[key]:id})
    if (result.error && result.error.code!=='23505') { notify('No se pudo actualizar favoritos: '+result.error.message); return }
    if (isTrip) setSavedTripIds(items=>current.includes(id)?items.filter(x=>x!==id):[...items,id])
    else setSavedPostIds(items=>current.includes(id)?items.filter(x=>x!==id):[...items,id])
    notify(current.includes(id)?'Eliminado de favoritos.':'Guardado en tus favoritos sincronizados.')
  }

  async function loadTrips(userId: string) {
    if (!supabase) return
    const { data, error } = await supabase.from('trips').select('id,name,description,start_date,end_date,visibility,trip_photos(storage_path),trip_custom_stops(name,catalog_destination_id,sort_order)').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) { notify('No pudimos cargar tus viajes: ' + error.message); return }
    const rows = await Promise.all((data || []).map(async (row: any) => {
      const paths = (row.trip_photos || []).map((photo: any) => photo.storage_path).filter(Boolean)
      const urls = await Promise.all(paths.map(async (path: string) => {
        const { data: signed } = await supabase!.storage.from('travel-media').createSignedUrl(path, 3600)
        return signed?.signedUrl || ''
      }))
      const stops: TripStop[] = (row.trip_custom_stops || []).sort((a:any,b:any)=>a.sort_order-b.sort_order).map((stop:any)=>({name:stop.name,catalogDestinationId:stop.catalog_destination_id ?? null,sortOrder:stop.sort_order}))
      return { id: row.id, name: row.name, start: row.start_date || '', end: row.end_date || '', description: row.description || '', destinationIds: stops.filter(stop=>stop.catalogDestinationId !== null).map(stop=>stop.catalogDestinationId as number), stops, visibility: row.visibility, photos: urls.filter(Boolean) } as Trip
    }))
    setTrips(rows)
  }

  async function deleteTrip(trip: Trip) {
    if (!supabase) return
    const user = await getCurrentAuthUser()
    if (!user) { notify('Inicia sesión para eliminar esta bitácora.'); return }
    if (!window.confirm(`¿Eliminar la bitácora “${trip.name}”, sus paradas y fotografías? Esta acción no se puede deshacer.`)) return
    setBusy(true)
    const { data: photos } = await supabase.from('trip_photos').select('storage_path').eq('trip_id', trip.id).eq('user_id', user.id)
    const paths = (photos || []).map((photo: any) => photo.storage_path).filter(Boolean)
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from('travel-media').remove(paths)
      if (storageError) { setBusy(false); notify('No se pudieron eliminar las fotografías: ' + storageError.message); return }
    }
    const { error } = await supabase.from('trips').delete().eq('id', trip.id).eq('user_id', user.id)
    setBusy(false)
    if (error) { notify('No se pudo eliminar la bitácora: ' + error.message); return }
    setTrips(items => items.filter(item => item.id !== trip.id))
    notify('Bitácora eliminada correctamente.')
  }

  async function addTripPhoto(tripId: string, file?: File) {
    if (!file || !supabase) return
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { notify('Selecciona JPG, PNG o WebP de máximo 5 MB.'); return }
    const user = await getCurrentAuthUser()
    if (!user) { setAuthMode('login'); setAuthOpen(true); notify('Inicia sesión para guardar fotografías.'); return }
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = user.id + '/trips/' + tripId + '/' + crypto.randomUUID() + '.' + ext
    setBusy(true)
    const { error: uploadError } = await supabase.storage.from('travel-media').upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) { setBusy(false); notify('No se pudo subir la foto: ' + uploadError.message); return }
    const { error: rowError } = await supabase.from('trip_photos').insert({ trip_id: tripId, user_id: user.id, storage_path: path })
    if (rowError) { await supabase.storage.from('travel-media').remove([path]); setBusy(false); notify('No se pudo vincular la foto: ' + rowError.message); return }
    const { data: signed } = await supabase.storage.from('travel-media').createSignedUrl(path, 3600)
    setTrips(items => items.map(trip => trip.id === tripId ? { ...trip, photos: [...trip.photos, signed?.signedUrl || ''].filter(Boolean) } : trip))
    await loadGallery(user.id)
    setBusy(false); notify('Fotografía añadida a tu bitácora.')
  }

  async function getCurrentAuthUser() {
    if (!supabase) return null
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (session?.user) return session.user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (user) return user
    if (authUserId) return { id: authUserId } as { id: string }
    if (sessionError || userError) console.warn('Supabase auth state:', sessionError || userError)
    return null
  }

  async function loadMotorcycle(userId: string) {
    if (!supabase) return
    const { data: bike, error } = await supabase.from('motorcycles').select('*').eq('user_id', userId).maybeSingle()
    if (error) { notify('No pudimos cargar tu motocicleta: ' + error.message); return }
    if (!bike) { setMotorcycleId(null); setMaintenance([]); setDocuments([]); return }
    setMotorcycleId(bike.id)
    setMotorcycleBrand(bike.brand || '')
    setMotorcycleModel(bike.model || '')
    setMotorcycleYear(bike.year ? String(bike.year) : '')
    setMotorcycleCc(bike.displacement_cc ? String(bike.displacement_cc) : '')
    setMotorcycleType(bike.motorcycle_type || 'Adventure')
    setMotorcycleFuel(bike.fuel_type || 'Gasolina')
    setMotorcycleOdometer(bike.odometer_km != null ? String(bike.odometer_km) : '')
    setMotorcycleNotes(bike.notes || '')
    setMotorcyclePhoto(bike.photo_url || '')
    setMotorcycleCropX(Number(bike.photo_position_x ?? 50)); setMotorcycleCropY(Number(bike.photo_position_y ?? 50))
    if (bike.photo_url?.startsWith('motorcycles/')) {
      const { data: signed } = await supabase.storage.from('motorcycles').createSignedUrl(bike.photo_url.slice('motorcycles/'.length), 3600)
      setMotorcyclePhotoPreview(signed?.signedUrl || '')
    } else setMotorcyclePhotoPreview('')
    const [{ data: services, error: servicesError }, { data: docs, error: docsError }] = await Promise.all([
      supabase.from('motorcycle_maintenance').select('*').eq('motorcycle_id', bike.id).eq('user_id', userId).order('service_date', { ascending: false }),
      supabase.from('motorcycle_documents').select('*').eq('motorcycle_id', bike.id).eq('user_id', userId).order('expiry_date', { ascending: true })
    ])
    if (servicesError) notify('No pudimos cargar el mantenimiento: ' + servicesError.message)
    else setMaintenance(services || [])
    if (docsError) notify('No pudimos cargar los documentos: ' + docsError.message)
    else setDocuments(docs || [])
  }

  async function saveMotorcycle() {
    if (!supabase) return
    const user = await getCurrentAuthUser()
    if (!user) { notify('Tu sesión no está disponible. Vuelve a entrar y prueba nuevamente.'); return }
    if (!motorcycleBrand.trim() || !motorcycleModel.trim()) { notify('Completa marca y modelo en Configuración.'); return }
    const cc = motorcycleCc.trim() ? Number(motorcycleCc) : null, km = motorcycleOdometer.trim() ? Number(motorcycleOdometer) : null
    if ((cc !== null && (!Number.isInteger(cc) || cc < 1 || cc > 3000)) || (km !== null && (!Number.isFinite(km) || km < 0))) { notify('Revisa cilindrada y kilometraje.'); return }
    setMotorcycleBusy(true)
    let photoPath = motorcyclePhoto.trim() || null
    if (motorcyclePhotoFile) {
      const extension = motorcyclePhotoFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = user.id + '/' + crypto.randomUUID() + '.' + extension
      const {error:uploadError} = await supabase.storage.from('motorcycles').upload(path,motorcyclePhotoFile,{upsert:false,contentType:motorcyclePhotoFile.type,cacheControl:'3600'})
      if (uploadError) { setMotorcycleBusy(false); notify('No se pudo subir la fotografía: ' + uploadError.message); return }
      photoPath = 'motorcycles/' + path
    }
    const payload = {user_id:user.id,brand:motorcycleBrand.trim(),model:motorcycleModel.trim(),year:motorcycleYear ? Number(motorcycleYear) : null,photo_url:photoPath,photo_position_x:motorcycleCropX,photo_position_y:motorcycleCropY,displacement_cc:cc,motorcycle_type:motorcycleType,fuel_type:motorcycleFuel,odometer_km:km,notes:motorcycleNotes.trim() || null,updated_at:new Date().toISOString()}
    const {data,error} = await supabase.from('motorcycles').upsert(payload,{onConflict:'user_id'}).select('id').single()
    setMotorcycleBusy(false); if (error) { notify('No se pudo guardar: ' + error.message); return }
    setMotorcycleId(data.id); setMotorcyclePhoto(photoPath || ''); setMotorcyclePhotoFile(null); if (photoPath?.startsWith('motorcycles/')) { const {data:signed}=await supabase.storage.from('motorcycles').createSignedUrl(photoPath.slice('motorcycles/'.length),3600); setMotorcyclePhotoPreview(signed?.signedUrl || '') } notify('Ficha de motocicleta sincronizada.')
  }
  async function addMaintenance() {
    if (!supabase || !motorcycleId) { notify('Primero guarda la ficha de tu motocicleta.'); return }
    const user = await getCurrentAuthUser(); if (!user) { setAuthMode('login'); setAuthOpen(true); notify('No encontramos una sesión activa. Inicia sesión para sincronizar tus datos.'); return }
    const km = maintenanceKm.trim() ? Number(maintenanceKm) : null, cost = maintenanceCost.trim() ? Number(maintenanceCost) : null
    if ((km !== null && km < 0) || (cost !== null && cost < 0)) { notify('Ingresa valores válidos.'); return }
    const {data,error} = await supabase.from('motorcycle_maintenance').insert({motorcycle_id:motorcycleId,user_id:user.id,service_date:maintenanceDate,service_type:maintenanceType,odometer_km:km,cost_pen:cost,notes:maintenanceNotes.trim() || null}).select('*').single()
    if (error) { notify('Error al registrar mantenimiento: ' + error.message); return }
    setMaintenance(items => [data,...items]); setMaintenanceKm(''); setMaintenanceCost(''); setMaintenanceNotes(''); notify('Mantenimiento registrado.')
  }
  async function addMotorcycleDocument() {
    if (!supabase || !motorcycleId) { notify('Primero guarda la ficha de tu motocicleta.'); return }
    const user = await getCurrentAuthUser()
    if (!user || !documentExpiry) { if (!user) { setAuthMode('login'); setAuthOpen(true) }; notify(!user ? 'Inicia sesión para continuar.' : 'Selecciona la fecha de vencimiento.'); return }
    if (documentFile && (!['image/jpeg','image/png','image/webp','application/pdf'].includes(documentFile.type) || documentFile.size > 10*1024*1024)) { notify('Adjunta JPG, PNG, WebP o PDF de máximo 10 MB.'); return }
    setDocumentBusy(true)
    let storagePath: string | null = null
    if (documentFile) {
      const ext = documentFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      storagePath = user.id + '/documents/' + crypto.randomUUID() + '.' + ext
      const {error:uploadError} = await supabase.storage.from('motorcycles').upload(storagePath,documentFile,{upsert:false,contentType:documentFile.type})
      if (uploadError) { setDocumentBusy(false); notify('No se pudo subir el documento: ' + uploadError.message); return }
    }
    const {data,error} = await supabase.from('motorcycle_documents').insert({motorcycle_id:motorcycleId,user_id:user.id,document_type:documentType,expiry_date:documentExpiry,storage_path:storagePath}).select('*').single()
    setDocumentBusy(false)
    if (error) { if(storagePath) await supabase.storage.from('motorcycles').remove([storagePath]); notify('Error al guardar documento: ' + error.message); return }
    setDocuments(items => [...items,data].sort((a,b)=>a.expiry_date.localeCompare(b.expiry_date))); setDocumentExpiry(''); setDocumentFile(null); notify('Documento y vencimiento guardados de forma privada.')
  }
  async function openMotorcycleDocument(path: string) {
    if (!supabase) return
    const {data,error} = await supabase.storage.from('motorcycles').createSignedUrl(path,300)
    if (error || !data?.signedUrl) { notify('No se pudo abrir el documento.'); return }
    window.open(data.signedUrl,'_blank','noopener,noreferrer')
  }

  async function deleteMotorcycleDocument(doc: any) {
    if (!supabase) return
    const user=await getCurrentAuthUser()
    if(!user){notify('Inicia sesión para eliminar el documento.');return}
    if(!window.confirm(`¿Eliminar ${doc.document_type} y su archivo? Esta acción no se puede deshacer.`))return
    setDocumentBusy(true)
    if(doc.storage_path){const {error:storageError}=await supabase.storage.from('motorcycles').remove([doc.storage_path]);if(storageError){setDocumentBusy(false);notify('No se pudo eliminar el archivo: '+storageError.message);return}}
    const {error}=await supabase.from('motorcycle_documents').delete().eq('id',doc.id).eq('user_id',user.id)
    setDocumentBusy(false)
    if(error){notify('No se pudo eliminar el registro: '+error.message);return}
    setDocuments(items=>items.filter(item=>item.id!==doc.id));notify('Documento eliminado correctamente.')
  }
  async function saveProfile() {
    if (!supabase) { notify('Supabase no está disponible.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { notify('Inicia sesión para guardar tu perfil.'); return }
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (cleanUsername.length < 3) { notify('El nombre de usuario debe tener al menos 3 caracteres.'); return }
    const year = motorcycleYear.trim() ? Number(motorcycleYear) : null
    if (year !== null && (!Number.isInteger(year) || year < 1885 || year > new Date().getFullYear() + 1)) {
      notify('Ingresa un año válido para tu motocicleta.'); return
    }
    setProfileBusy(true)
    let nextAvatarUrl = avatarUrl
    if (avatarFile) {
      const ext = avatarFile.type === 'image/png' ? 'png' : avatarFile.type === 'image/webp' ? 'webp' : 'jpg'
      const path = user.id + '/' + crypto.randomUUID() + '.' + ext
      const {error:uploadError} = await supabase.storage.from('avatars').upload(path,avatarFile,{upsert:false,contentType:avatarFile.type,cacheControl:'3600'})
      if (uploadError) { setProfileBusy(false); notify('No se pudo subir la foto de perfil: ' + uploadError.message); return }
      nextAvatarUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    }
    const { error } = await supabase.from('profiles').update({
      username: cleanUsername, full_name: displayName.trim() || 'Viajero Motero',
      bio: bio.trim() || null, city: homeCity.trim() || null, avatar_url: nextAvatarUrl || null,
      motorcycle_brand: motorcycleBrand.trim() || null, motorcycle_model: motorcycleModel.trim() || null,
      motorcycle_year: year, profile_completed: true, updated_at: new Date().toISOString()
    }).eq('id', user.id)
    setProfileBusy(false)
    if (error) { notify(error.code === '23505' ? 'Ese nombre de usuario ya está ocupado.' : 'No se pudo guardar el perfil: ' + error.message); return }
    setAvatarUrl(nextAvatarUrl); setAvatarFile(null)
    setUsername(cleanUsername)
    setSubview('')
    notify('Perfil guardado y sincronizado con tu cuenta.')
  }

  async function submitAuth() {
    if (!authEmail.trim() || authPassword.length < 8) { notify('Ingresa un correo válido y una contraseña de al menos 8 caracteres.'); return }
    if (authMode === 'register' && (!registerName.trim() || registerUsername.trim().length < 3)) { notify('Completa tu nombre y un usuario de al menos 3 caracteres.'); return }
    if (!supabase) { notify('La autenticación real se activa al conectar Supabase. Puedes continuar explorando en modo demostración.'); setAuthOpen(false); return }
    setAuthBusy(true)
    const result = authMode === 'register'
      ? await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword, options: { data: { username: registerUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''), display_name: registerName.trim(), full_name: registerName.trim(), city: registerCity.trim(), motorcycle: registerMotorcycle.trim() } } })
      : await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword })
    setAuthBusy(false)
    if (result.error) { notify(result.error.message); return }
    setAuthOpen(false); setAuthPassword(''); notify(authMode === 'register' ? 'Registro enviado. Revisa tu correo si la confirmación está habilitada.' : 'Sesión iniciada correctamente.')
  }
  async function startOAuth(provider: 'google'|'apple'|'facebook') {
    if (!supabase) { notify('Conecta Supabase para habilitar el acceso social.'); return }
    setAuthBusy(true)
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: 'https://pasaporte-motero.pages.dev', ...(provider === 'google' ? { queryParams: { prompt: 'select_account' } } : {}) } })
    setAuthBusy(false)
    if (error) notify('No se pudo iniciar con '+provider+': '+error.message)
  }

  async function signOut() {
    if (supabase) {
      const {error} = await supabase.auth.signOut()
      if (error) { notify('No se pudo cerrar la sesión: ' + error.message); return }
    }
    resetSignedOutData()
    notify('Sesión cerrada.')
  }

  const navItems: {id: Tab; label: string; icon: typeof Compass}[] = [
    { id: 'explore', label: 'Explorar', icon: Compass }, { id: 'passport', label: 'Pasaporte', icon: BookOpen },
    { id: 'community', label: 'Comunidad', icon: Users }, { id: 'profile', label: 'Perfil', icon: UserRound },
  ]

  return <div className={`app-shell theme-${theme}`}>
    <header className="topbar">
      <button className="brand" onClick={() => openTab('explore')} aria-label="Ir a inicio"><span className="brand-mark"><Bike size={21}/></span><span><strong>PASAPORTE MOTERO</strong><small>RUTAS · HISTORIAS · DESTINOS</small></span></button>
      <div className="top-actions"><span className={`connection-dot ${offline ? 'off' : ''}`} title={offline ? 'Sin conexión' : 'Con conexión'}/><button className="icon-button theme-toggle" aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'} onClick={() => setTheme(v => v === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="icon-button" aria-label="Notificaciones" onClick={() => notify('No tienes notificaciones nuevas.')}><Bell size={19}/></button></div>
    </header>
    {offline && <div className="offline-banner"><CloudOff size={15}/> Modo sin conexión. Tus cambios se guardan en este dispositivo.</div>}

    <main className="content" key={`${tab}-${subview}`}>
      {selected ? <section className="destination-detail">
        <button className="back-link" onClick={() => setSelected(null)}><ArrowLeft size={17}/> Volver a destinos</button>
        <div className="destination-hero"><img src={selected.image} alt={selected.title}/><div className="hero-shade"/><span className="hero-category">{selected.category}</span><h1>{selected.title}</h1><p><MapPin size={14}/> {selected.city}, {selected.region}</p></div>
        <div className="detail-actions"><button className="primary" onClick={() => { setVisitDestination(selected.id); openAction('visit') }}><ShieldCheck size={17}/> Validar visita</button><button className="secondary" onClick={() => toggleSaved(selected.id)}><Bookmark size={17}/> {saved.includes(selected.id) ? 'Guardado' : 'Guardar'}</button></div>
        <p className="detail-description">{selected.description}</p>
        <div className="detail-info"><span><MapPinned size={16}/> {selected.province}, {selected.region}</span><span><LocateFixed size={16}/> Radio de validación: {selected.radius} m</span></div>
        <button className="secondary full" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`, '_blank', 'noopener,noreferrer')}><Navigation size={17}/> Cómo llegar</button>
        <div className="section-heading"><h2>Tu estado</h2></div><div className="status-card">{visitedIds.has(selected.id) ? <><BadgeCheck/><div><strong>Destino visitado</strong><small>Ya tienes este sello en tu pasaporte.</small></div></> : <><Lock/><div><strong>Pendiente de visitar</strong><small>Completa una visita para obtener el sello.</small></div></>}</div>
      </section> : <>
        {tab === 'explore' && <section>
          <div className="page-heading"><div><span className="eyebrow">DESCUBRE EL PERÚ</span><h1>Tu próxima aventura te espera.</h1><p className="muted">Encuentra rutas, paisajes y lugares para sumar a tu pasaporte.</p></div><div className="heading-icon"><Compass size={23}/></div></div>
          <div className="search-row"><div className="searchbox"><Search size={18}/><input aria-label="Buscar destinos" placeholder="Buscar destinos, ciudades..." value={query} onChange={e => setQuery(e.target.value)}/></div><button className={`filter-button ${showFilters ? 'selected' : ''}`} onClick={() => setShowFilters(!showFilters)} aria-label="Filtros"><SlidersHorizontal size={18}/></button></div>
          {showFilters && <div className="filter-panel"><label>Departamento<select value={regionFilter} onChange={e => setRegionFilter(e.target.value)}><option>Todos</option>{allRegions.map(r => <option key={r}>{r}</option>)}</select></label><label>Categoría<select value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label></div>}
          <div className="chips">{categories.map(cat => <button key={cat} className={category === cat ? 'chip active' : 'chip'} onClick={() => setCategory(cat)}>{cat}</button>)}</div>
          <div className="section-heading"><h2>Destinos para descubrir</h2><button className="text-action" onClick={() => setMapMode(!mapMode)}><Map size={15}/> {mapMode ? 'Ver lista' : 'Ver mapa'}</button></div>
          {mapMode && <div className="map-placeholder map-frame"><iframe title="Mapa de destinos registrados en Pasaporte Motero" srcDoc={`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0;font-family:Arial} .leaflet-popup-content{font-size:13px}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const map=L.map('map').setView([-9.19,-75.02],5);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);const points=${JSON.stringify(filteredMapDestinations.map(d=>({name:d.title,city:d.city,region:d.region,lat:d.lat,lng:d.lng})))};const valid=points.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));valid.forEach(p=>{const marker=L.marker([p.lat,p.lng]).addTo(map);marker.bindPopup('<strong>'+String(p.name).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</strong><br>'+p.city+', '+p.region)});if(valid.length){const bounds=L.latLngBounds(valid.map(p=>[p.lat,p.lng]));if(bounds.isValid())map.fitBounds(bounds.pad(.12));}setTimeout(()=>map.invalidateSize(),180)</script></body></html>`} loading="lazy"/><span>{filteredMapDestinations.length} destinos registrados en el catálogo · Selecciona un marcador para ver su nombre.</span><button className="text-action" onClick={() => setMapMode(false)}>Volver a la lista</button></div>}
          {!mapMode && <><div className="destination-view-switch" aria-label="Forma de visualizar destinos"><button className={destinationView==='list'?'active':''} onClick={()=>setDestinationView('list')} aria-label="Vista lista"><BookOpen size={16}/> Lista</button><button className={destinationView==='grid'?'active':''} onClick={()=>setDestinationView('grid')} aria-label="Vista cuadrícula"><Images size={16}/> Cuadrícula</button><button className={destinationView==='compact'?'active':''} onClick={()=>setDestinationView('compact')} aria-label="Vista compacta"><ListIcon size={16}/> Compacta</button></div><div className={`destination-list destination-${destinationView}`}>{filteredDestinations.map(dest => <button className="destination-card" key={dest.id} onClick={() => setSelected(dest)}><img src={dest.image} alt=""/><span className="destination-overlay"/><span className="destination-tag">{dest.category}</span><span className="destination-copy"><strong>{dest.title}</strong><small><MapPin size={13}/> {dest.city}, {dest.region}</small></span><span className="destination-distance">{dest.distance}</span></button>)}</div></>}
          {filteredDestinations.length === 0 && <div className="empty-card"><Search size={30}/><h3>No encontramos destinos</h3><p>Prueba con otro nombre o cambia los filtros.</p></div>}
          <div className="section-heading"><h2>Explora por departamento</h2><span className="muted tiny">25 territorios</span></div><div className="region-pills">{allRegions.map(r => <button key={r} onClick={() => { setRegionFilter(r); setShowFilters(true); window.scrollTo({top:0,behavior:'smooth'}) }}>{r}<ChevronRight size={13}/></button>)}</div>
        </section>}

        {tab === 'passport' && <section>
          <div className="page-heading"><div><span className="eyebrow">DOCUMENTA CADA AVENTURA</span><h1>Mi pasaporte</h1><p className="muted">Cada destino visitado deja una historia y un sello.</p></div><div className="heading-icon"><ShieldCheck size={23}/></div></div>
          <div className="passport-cover"><div className="passport-security passport-security-one"/><div className="passport-security passport-security-two"/><div className="passport-watermark"><Compass size={190}/></div><div className="cover-top"><span>✦</span> REPÚBLICA DEL PERÚ <span>✦</span></div><div className="cover-emblem"><Bike size={39}/><span className="emblem-orbit"/></div><div className="cover-title">PASAPORTE<br/>MOTERO</div><div className="cover-subtitle">DOCUMENTO DE RUTA Y AVENTURA</div><div className="cover-divider"><span/><i/><span/></div><div className="cover-bottom"><span>TRAVEL</span><i/> <span>EXPLORE</span><i/> <span>REPEAT</span></div><div className="passport-serial">PM · PER · 2026</div><div className="passport-microtext">RUTAS QUE NOS UNEN · PERÚ · LIBERTAD SOBRE RUEDAS</div></div>
          <div className="stats-grid"><div className="stat"><strong>{Math.max(0, Number(visitedCount) || 0)}</strong><span>Lugares visitados</span></div><div className="stat"><strong>{Math.max(0, Number(departmentStamps?.length) || 0)}</strong><span>Sellos obtenidos</span></div><div className="stat"><strong>{Math.max(0, authUserId ? Number(trips?.length) || 0 : 0)}</strong><span>Viajes</span></div></div>
          <div className="section-heading"><h2>Exploración del Perú</h2><span className="muted tiny">{progress}% · {visitedRegionCount}/25 departamentos</span></div><div className="progress"><span style={{width: `${progress}%`}}/></div>
          <div className="stamp-grid">{allRegions.map((name, i) => { const reg = regions.find(r => r.name === name); const code = ['AMA','ANC','APU','ARE','AYA','CAJ','CAL','CUS','HUV','HUC','ICA','JUN','LAL','LAM','LIM','LOR','MDD','MOQ','PAS','PIU','PUN','SAM','TAC','TUM','UCA'][i]; const stamp = departmentStamps.find(item => item.department_code === code); const Icon = [Map,Mountain,Tent,Sunrise][i%4]; return <button className={`stamp-tile ${stamp ? 'earned' : ''}`} key={name} onClick={() => { setQuery(name); setTab('explore') }} aria-label={`Sello de ${name}: ${stamp ? 'obtenido' : 'pendiente'}`}><span className="stamp-art">{stamp ? <CheckCircle2 size={22}/> : <Icon size={22}/>}<small>{code}</small></span><strong>{name}</strong><small>{stamp ? `Obtenido · ${new Date(stamp.earned_at).toLocaleDateString('es-PE')}` : reg ? 'Por descubrir' : 'Sello disponible'}</small></button> })}</div>
          <div className="section-heading"><h2>Historial de validaciones</h2><span className="muted tiny">{visits.length} registros</span></div>
          {visits.length === 0 ? <div className="empty-card compact"><Stamp size={28}/><h3>Tu pasaporte está en blanco</h3><p>Descubre un destino y registra tu primera visita para conseguir un sello.</p><button className="primary" onClick={() => setTab('explore')}>Explorar destinos <Compass size={16}/></button></div> : <div className="history-list">{visits.map(v => { const d = destinations.find(x => x.id === v.destinationId); return <div className="history-row" key={v.id}><span className={`history-icon ${v.status}`}><Stamp size={18}/></span><div><strong>{d?.title || 'Destino'}</strong><small>{new Date(v.date).toLocaleDateString('es-PE')} · {v.method === 'gps' ? 'GPS' : v.method === 'photo' ? 'Fotografía' : 'QR presencial'}</small></div><span className={`state-pill ${v.status}`}>{v.status === 'validated' ? 'Validado' : v.status === 'pending' ? 'Pendiente' : 'Rechazado'}</span></div> })}</div>}
        </section>}

        {tab === 'community' && <section>
          <div className="page-heading"><div><span className="eyebrow">TU COMUNIDAD VIAJERA</span><h1>Historias sobre ruedas.</h1><p className="muted">Inspírate, comparte y descubre nuevos destinos.</p></div><div className="heading-icon"><Users size={23}/></div></div>
          <button className="composer-shortcut" onClick={() => openAction('post')}><span className="avatar small">{initials(displayName)}</span><span>¿Qué aventura quieres contar?</span><span className="round-add"><Plus size={18}/></span></button>
          <div className="feed-switch"><button className={feedMode === 'all' ? 'active' : ''} onClick={() => setFeedMode('all')}>Comunidad</button><button className={feedMode === 'following' ? 'active' : ''} onClick={() => setFeedMode('following')}>Siguiendo</button></div>
          {visiblePosts.map(post => <article className={`post-card community-post ${post.kind === 'trip' ? 'trip-feed-card' : ''}`} key={post.id}><header className="community-post-header"><div className="community-author-avatar">{post.authorAvatar ? <img src={post.authorAvatar} alt=""/> : initials(post.authorName || displayName)}</div><div className="community-author-meta"><strong>{post.authorName || displayName}</strong><span>@{post.authorUsername || username}</span><small>{post.date} · {post.kind === 'trip' ? 'Bitácora de viaje' : 'Publicación'}</small></div><button className="community-more" aria-label="Más opciones" onClick={() => notify('Opciones de publicación disponibles próximamente.')}><MoreHorizontal size={20}/></button></header>{post.kind === 'trip' && <div className="community-post-type"><Route size={14}/> BITÁCORA PÚBLICA</div>}{post.image && <div className="community-post-cover"><img src={post.image} alt={post.kind === 'trip' ? 'Fotografía de la bitácora' : 'Fotografía compartida'}/></div>}{post.kind === 'trip' && post.tripPhotos && post.tripPhotos.length > 1 && <div className="community-post-gallery">{post.tripPhotos.slice(1,4).map((url,index)=><img key={index} src={url} alt={`Fotografía adicional ${index+2}`}/>)}</div>}<div className="community-post-content"><div className="community-post-location"><MapPin size={14}/>{post.place}</div><h3>{post.title}</h3><p>{post.text}</p>{post.kind === 'trip' && !!post.tripStops?.length && <div className="community-route"><strong><Route size={15}/> Ruta del viaje <span>{post.tripStops.length} paradas</span></strong><ol>{post.tripStops.map((stop,index)=><li key={index}>{stop}</li>)}</ol></div>}</div><footer className="community-post-actions">{post.kind === 'post' ? <><button onClick={() => toggleLike(post.id)} className={post.liked ? 'liked' : ''}><Heart size={18} fill={post.liked ? 'currentColor' : 'none'}/><span>{post.likes || 'Me gusta'}</span></button><button onClick={() => setCommentPost(post.id)}><MessageCircle size={18}/><span>{post.comments.length || 'Comentar'}</span></button></> : <span className="community-trip-caption"><ShieldCheck size={15}/> Compartida públicamente</span>}<button onClick={() => { if (navigator.share) navigator.share({title: post.title, text: post.text}).catch(() => undefined); else notify('Comparte esta publicación copiando su enlace cuando esté publicada en línea.') }}><Share2 size={18}/><span>Compartir</span></button><button aria-label="Guardar publicación" onClick={() => notify('Publicación guardada en favoritos locales.')}><Bookmark size={18}/></button></footer></article>)}
          {visiblePosts.length === 0 && <div className="empty-card"><Users size={30}/><h3>Aún no sigues viajeros</h3><p>Descubre historias de la comunidad y sigue a otros motociclistas para ver sus aventuras aquí.</p><button className="primary" onClick={() => setFeedMode('all')}>Ver comunidad</button></div>}
        </section>}

        {tab === 'profile' && <section>
          {subview === 'motorcycle' ? <><button className="back-link" onClick={() => setSubview('')}><ArrowLeft size={17}/> Mi perfil</button><span className="eyebrow">TU COMPAÑERA DE RUTA</span><h1>Mi motocicleta</h1><p className="muted">Ficha técnica, kilometraje, mantenimiento y documentos.</p><div className="settings-card motorcycle-card"><button type="button" className="collapsible-heading" aria-expanded={motorcycleOpen} onClick={()=>setMotorcycleOpen(v=>!v)}><span><Bike size={18}/> Ficha técnica</span><ChevronDown className={motorcycleOpen?'chevron-open':''} size={18}/></button>{motorcycleOpen && <>{(motorcyclePhotoPreview || motorcyclePhoto) && <div className={`motorcycle-crop-frame ${motorcyclePhotoFile ? "is-editing" : ""}`} onPointerDown={startMotorcycleCrop} onPointerMove={moveMotorcycleCrop} onPointerUp={endMotorcycleCrop} onPointerCancel={endMotorcycleCrop} role={motorcyclePhotoFile ? "group" : undefined} aria-label={motorcyclePhotoFile ? "Arrastra la fotografía para encuadrarla" : undefined}><img className="motorcycle-photo" style={{objectPosition:`${motorcycleCropX}% ${motorcycleCropY}%`}} src={motorcyclePhotoPreview || motorcyclePhoto} alt="Fotografía de mi motocicleta"/>{motorcyclePhotoFile && <span className="crop-hint">Arrastra la foto para encuadrarla</span>}</div>}<label className="file-pick motorcycle-file"><ImagePlus size={17}/> {motorcyclePhotoFile ? motorcyclePhotoFile.name : 'Elegir fotografía desde galería'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>5*1024*1024){notify('La fotografía debe pesar máximo 5 MB.');e.currentTarget.value='';return}if(!['image/jpeg','image/png','image/webp'].includes(file.type)){notify('Usa una imagen JPG, PNG o WebP.');e.currentTarget.value='';return}setMotorcyclePhotoFile(file);setMotorcyclePhotoPreview(URL.createObjectURL(file));setMotorcyclePhoto('')}}/></label><p className="muted tiny">JPG, PNG o WebP · máximo 5 MB. {motorcyclePhotoFile ? "Arrastra la imagen para ajustar el encuadre; quedará fijo al guardar." : "La fotografía guardada no se moverá. Para cambiarla, selecciona otra imagen."}</p><div className="form-grid"><label>Marca<input value={motorcycleBrand} onChange={e=>setMotorcycleBrand(e.target.value)} placeholder="CF Moto"/></label><label>Modelo<input value={motorcycleModel} onChange={e=>setMotorcycleModel(e.target.value)} placeholder="MT450"/></label></div><div className="form-grid"><label>Año<input type="number" value={motorcycleYear} onChange={e=>setMotorcycleYear(e.target.value)} placeholder="2026"/></label><label>Cilindrada (cc)<input type="number" value={motorcycleCc} onChange={e=>setMotorcycleCc(e.target.value)} placeholder="449"/></label></div><div className="form-grid"><label>Tipo<select value={motorcycleType} onChange={e=>setMotorcycleType(e.target.value)}>{['Adventure','Naked','Deportiva','Touring','Custom','Scooter','Doble propósito','Enduro','Otra'].map(x=><option key={x}>{x}</option>)}</select></label><label>Combustible<select value={motorcycleFuel} onChange={e=>setMotorcycleFuel(e.target.value)}>{['Gasolina','Eléctrica','Híbrida','Otro'].map(x=><option key={x}>{x}</option>)}</select></label></div><label>Kilometraje actual (km)<input type="number" inputMode="numeric" value={motorcycleOdometer} onChange={e=>setMotorcycleOdometer(e.target.value)} placeholder="Ej. 12500"/></label><label>Notas y modificaciones<textarea rows={3} value={motorcycleNotes} onChange={e=>setMotorcycleNotes(e.target.value)} placeholder="Accesorios, neumáticos, equipamiento..."/></label><button className="primary full" disabled={motorcycleBusy} onClick={saveMotorcycle}>{motorcycleBusy?'Guardando…':'Guardar ficha técnica'}</button></>}</div><div className="settings-card"><button type="button" className="collapsible-heading" aria-expanded={maintenanceOpen} onClick={()=>setMaintenanceOpen(v=>!v)}><span><Wrench size={18}/> Historial de mantenimiento</span><ChevronDown className={maintenanceOpen?'chevron-open':''} size={18}/></button>{maintenanceOpen && <><label>Servicio<select value={maintenanceType} onChange={e=>setMaintenanceType(e.target.value)}>{['Cambio de aceite','Filtro de aceite','Filtro de aire','Kit de arrastre','Neumáticos','Frenos','Refrigerante','Bujías','Revisión general','Otro'].map(x=><option key={x}>{x}</option>)}</select></label><div className="form-grid maintenance-fields"><label>Fecha<input className="date-control" type="date" value={maintenanceDate} onChange={e=>setMaintenanceDate(e.target.value)}/></label><label>Kilometraje (km)<input className="date-control" type="number" inputMode="numeric" value={maintenanceKm} onChange={e=>setMaintenanceKm(e.target.value)} placeholder="Ej. 12500"/></label></div><label>Costo (S/)<input type="number" value={maintenanceCost} onChange={e=>setMaintenanceCost(e.target.value)} placeholder="0.00"/></label><label>Detalle<textarea rows={2} value={maintenanceNotes} onChange={e=>setMaintenanceNotes(e.target.value)} placeholder="Taller, repuestos o notas"/></label><button className="secondary full" onClick={addMaintenance}><Plus size={16}/> Registrar mantenimiento</button>{maintenance.length===0?<p className="muted">Todavía no tienes servicios registrados.</p>:<div className="history-list">{maintenance.map(item=><div className="history-row" key={item.id}><span className="history-icon validated"><Wrench size={17}/></span><div><strong>{item.service_type}</strong><small>{formatDisplayDate(item.service_date)} · {item.odometer_km ?? '—'} km · {item.cost_pen != null ? 'S/ '+item.cost_pen : 'Sin costo'}</small>{item.notes && <small>{item.notes}</small>}</div></div>)}</div>}</>}</div><div className="settings-card"><button type="button" className="collapsible-heading" aria-expanded={documentsOpen} onClick={()=>setDocumentsOpen(v=>!v)}><span><FileText size={18}/> Documentos y vencimientos</span><ChevronDown className={documentsOpen?'chevron-open':''} size={18}/></button>{documentsOpen && <><label>Documento<select value={documentType} onChange={e=>setDocumentType(e.target.value)}>{['SOAT','Revisión técnica','Licencia de conducir','Tarjeta de propiedad','Seguro','Otro'].map(x=><option key={x}>{x}</option>)}</select></label><label>Fecha de vencimiento<input className="document-date-control" type="date" value={documentExpiry} onChange={e=>setDocumentExpiry(e.target.value)}/></label><label className="file-pick"><FileText size={16}/> {documentFile ? documentFile.name : 'Adjuntar archivo del documento (opcional)'}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>setDocumentFile(e.target.files?.[0] || null)}/></label><p className="muted tiny">El archivo se almacena de forma privada. JPG, PNG, WebP o PDF · máximo 10 MB.</p><button className="secondary full" disabled={documentBusy} onClick={addMotorcycleDocument}><CalendarClock size={16}/> {documentBusy?'Guardando…':'Guardar documento y vencimiento'}</button>{documents.length===0?<p className="muted">Añade fechas para tenerlas presentes. Los avisos automáticos se habilitarán en una siguiente etapa.</p>:<div className="history-list">{documents.map(doc=><div className="history-row document-history-row" key={doc.id}><span className="history-icon pending"><FileText size={17}/></span><div className="document-summary"><strong>{doc.document_type}</strong><span className="document-expiry-label">VENCE EL</span><b className="document-expiry-date">{formatDisplayDate(doc.expiry_date)}</b><span className={`document-status ${doc.expiry_date < new Date().toISOString().slice(0,10) ? "expired" : "valid"}`}>{doc.expiry_date < new Date().toISOString().slice(0,10) ? "Vencido" : "Vigente"}</span>{doc.storage_path && <button className="text-action" onClick={()=>openMotorcycleDocument(doc.storage_path)}>Ver documento <FileCheck2 size={14}/></button>}</div><button className="document-delete" type="button" disabled={documentBusy} onClick={()=>deleteMotorcycleDocument(doc)} aria-label={`Eliminar ${doc.document_type}`} title="Eliminar documento"><X size={17}/></button></div>)}</div>}</>}</div></> : subview === 'trips' ? <><button className="back-link" onClick={() => setSubview('')}><ArrowLeft size={17}/> Mi perfil</button><span className="eyebrow">TUS EXPEDICIONES</span><h1>Mis viajes</h1><button className="primary full" onClick={() => openAction('trip')}><Plus size={17}/> Crear nuevo viaje</button>{trips.length === 0 ? <div className="empty-card"><Route size={34}/><h3>Tu próxima ruta comienza aquí</h3><p>Registra recorridos, paradas, fechas y recuerdos. Tu primera expedición puede ser Huaraz.</p><button className="primary" onClick={() => openAction('trip')}>Crear bitácora <Plus size={17}/></button></div> : <div className="trip-list">{trips.map(t => <article className="trip-card" key={t.id}><div className="trip-icon"><Route size={21}/></div><div className="trip-card-content"><div className="trip-card-title"><strong>{t.name}</strong><button type="button" className="icon-button trip-delete" aria-label={`Eliminar bitácora ${t.name}`} title="Eliminar bitácora" onClick={()=>void deleteTrip(t)}><X size={17}/></button></div><small>{t.start ? formatDisplayDate(t.start) : 'Fecha por definir'}{t.end ? ` — ${formatDisplayDate(t.end)}` : ''} · {(t.stops || []).length} paradas · {t.visibility === 'public' ? 'Público' : t.visibility === 'followers' ? 'Seguidores' : 'Privado'}</small><p>{t.description}</p>{(t.stops || []).length > 0 && <ol className="trip-stop-list trip-saved-stops">{t.stops.slice().sort((a,b)=>a.sortOrder-b.sortOrder).map((stop,index)=><li key={`${t.id}-${index}`}><span>{index+1}. {stop.name} <small>{stop.catalogDestinationId !== null ? 'Destino del catálogo' : 'Parada personalizada'}</small></span></li>)}</ol>}{t.photos.length > 0 && <div className="memory-grid trip-photo-grid">{t.photos.map((url,i)=><img key={i} src={url} alt={'Fotografía de '+t.name}/>)}</div>}<label className="file-pick trip-photo-pick"><ImagePlus size={16}/> Añadir fotos a esta bitácora<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{Array.from(e.target.files || []).forEach(file=>void addTripPhoto(t.id,file));e.currentTarget.value=''}}/></label></div></article>)}</div>}</> : subview === 'memories' ? <><button className="back-link" onClick={() => setSubview('')}><ArrowLeft size={17}/> Mi perfil</button><span className="eyebrow">TUS RECUERDOS</span><h1>Galería de viajes</h1><div className="memory-grid">{visits.filter(v => v.image).map(v => <img key={v.id} src={v.image} alt="Recuerdo de visita"/>)}{posts.filter(p => p.image).map(p => <img key={p.id} src={p.image} alt="Fotografía publicada"/> )}</div>{visits.every(v => !v.image) && posts.every(p => !p.image) && <div className="empty-card"><Images size={34}/><h3>Aún no hay fotografías propias</h3><p>Adjunta fotos a tus visitas y publicaciones para reunir aquí tus recuerdos.</p><button className="primary" onClick={createMemory}><Camera size={17}/> Crear recuerdo</button></div>}</> : !authUser ? <div className="signed-out-profile">
            <span className="eyebrow">TU IDENTIDAD VIAJERA</span><h1>Mi perfil</h1>
            <div className="signed-out-card">
              <div className="signed-out-icon"><ShieldCheck size={34}/></div>
              <h2>Tu ruta comienza aquí</h2>
              <p className="muted">Inicia sesión o crea una cuenta para acceder a tu pasaporte, motocicleta, viajes, fotografías y comunidad.</p>
              <button className="primary full" onClick={()=>{setAuthMode('login');setAuthOpen(true)}}>Iniciar sesión</button>
              <button className="secondary full" onClick={()=>{setAuthMode('register');setAuthOpen(true)}}>Registrarme</button>
            </div>
          </div> : <>
            <span className="eyebrow">TU IDENTIDAD VIAJERA</span><h1>Mi perfil</h1>
            <div className="profile-card"><div className="avatar large">{avatarUrl ? <img src={avatarUrl} alt="Foto de perfil"/> : initials(displayName)}</div><h2>{displayName}</h2><span className="muted">@{username}</span><p className="muted">{bio}</p><span className="profile-location"><MapPin size={13}/> {homeCity}</span><div className="profile-stats"><span><b>{followed.length}</b> siguiendo</span><span><b>0</b> seguidores</span><span><b>{posts.length}</b> publicaciones</span></div></div>
            <div className="profile-menu"><button onClick={() => setSubview('motorcycle')}><Bike/><span><strong>Mi motocicleta</strong><small>{motorcycleBrand && motorcycleModel ? motorcycleBrand + ' ' + motorcycleModel : 'Ficha técnica y mantenimiento'}</small></span><ChevronRight/></button><button onClick={() => setSubview('trips')}><Route/><span><strong>Mis viajes y bitácoras</strong><small>{trips.length} viajes registrados</small></span><ChevronRight/></button><button onClick={() => setSubview('memories')}><Images/><span><strong>Fotos y recuerdos</strong><small>Tu galería personal</small></span><ChevronRight/></button><button onClick={makePersonalQr}><QrCode/><span><strong>Mi QR de viajero</strong><small>Identificación para validación presencial</small></span><ChevronRight/></button><button onClick={() => setSubview('settings')}><Settings/><span><strong>Configuración</strong><small>Datos personales y privacidad</small></span><ChevronRight/></button><button onClick={() => authUser ? signOut() : setAuthOpen(true)}>{authUser ? <LogOut/> : <ShieldCheck/>}<span><strong>{authUser ? 'Cerrar sesión' : 'Iniciar sesión / Registrarme'}</strong><small>{authUser || (isSupabaseConfigured ? 'Accede para sincronizar tus datos' : 'Modo demostración disponible')}</small></span><ChevronRight/></button></div>
            {qr && <div className="qr-card"><h3>Mi identificación QR</h3><img src={qr} alt="QR personal de demostración"/><p>QR de demostración. Para validar visitas reales se necesita un token temporal generado por el servidor.</p></div>}
            {subview === 'settings' && <div className="settings-card"><div className="section-heading"><h2>Editar perfil</h2><button className="text-action" onClick={() => setSubview('')}>Cerrar</button></div><label className="file-pick profile-photo-pick"><UserRound size={17}/> {avatarFile ? avatarFile.name : 'Elegir foto de perfil'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];if(!f)return;if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5*1024*1024){notify('Usa JPG, PNG o WebP de máximo 5 MB.');e.currentTarget.value='';return}setAvatarFile(f);setAvatarUrl(URL.createObjectURL(f))}}/></label><label>Nombre para mostrar<input value={displayName} onChange={e => setDisplayName(e.target.value)}/></label><label>Nombre de usuario<input value={username} onChange={e => setUsername(e.target.value.replace(/\s/g,'').replace('@',''))}/></label><label>Biografía<textarea rows={3} value={bio} onChange={e => setBio(e.target.value)}/></label><label>Ciudad o país<input value={homeCity} onChange={e => setHomeCity(e.target.value)}/></label><div className="form-grid"><label>Marca de motocicleta<input value={motorcycleBrand} onChange={e => setMotorcycleBrand(e.target.value)} placeholder="Ej. Honda"/></label><label>Modelo<input value={motorcycleModel} onChange={e => setMotorcycleModel(e.target.value)} placeholder="Ej. CB 300F"/></label></div><label>Año de fabricación<input type="number" inputMode="numeric" min="1885" max={new Date().getFullYear()+1} value={motorcycleYear} onChange={e => setMotorcycleYear(e.target.value)} placeholder="Ej. 2024"/></label>{authUser ? <button className="primary full" disabled={profileBusy} onClick={saveProfile}>{profileBusy ? 'Guardando…' : 'Guardar y sincronizar perfil'}</button> : <button className="primary full" onClick={() => { notify('Inicia sesión para sincronizar tus datos.'); setAuthOpen(true) }}>Iniciar sesión para guardar</button>}{(profileRole === 'admin' || profileRole === 'manager') && <div className="admin-demo"><div className="section-heading"><h3>Panel de validaciones</h3><button className="text-action" onClick={loadAdminVisits}>Actualizar</button></div><p>{adminVisits.length} solicitudes pendientes de revisión</p><label>Destino para generar QR presencial<select value={visitDestination} onChange={e=>setVisitDestination(Number(e.target.value))}>{destinations.map(d=><option key={d.id} value={d.id}>{d.title} · {d.region}</option>)}</select></label><button className="secondary full" disabled={adminBusy} onClick={()=>createVisitQr(visitDestination)}><QrCode size={16}/> Generar QR de visita (2 minutos)</button><div className="staff-scan-panel"><strong>Validar QR del viajero</strong><p className="muted tiny">El encargado escanea el QR personal del motociclista y confirma su presencia en el destino seleccionado.</p><button type="button" className="secondary full" disabled={adminBusy} onClick={qrScanning ? stopQrScanner : startQrScanner}><Camera size={16}/>{qrScanning ? 'Cerrar cámara' : 'Abrir lector QR integrado'}</button>{qrScanning && <video ref={qrVideoRef} className="qr-scanner-video" autoPlay muted playsInline/>}<label>Código QR del viajero<input value={qrManual} onChange={e=>setQrManual(e.target.value)} placeholder="Escanea el QR personal del viajero"/></label><button className="primary full" disabled={adminBusy || !qrManual.trim()} onClick={validateRiderQr}>{adminBusy ? 'Validando…' : 'Confirmar visita presencial'}</button></div>{qr && qrChallengeExpires && <div className="qr-card"><img src={qr} alt="QR temporal de validación presencial"/><p>Vence: {new Date(qrChallengeExpires).toLocaleTimeString('es-PE')}</p></div>}{adminBusy && <p className="muted">Actualizando…</p>}{adminVisits.map(v => <div className="admin-visit" key={v.id}><strong>{v.destination?.name || 'Destino'}</strong><small>{v.rider?.full_name || v.rider?.username || 'Motero'} · {v.validation_method?.toUpperCase()} · {new Date(v.visited_at).toLocaleString('es-PE')}</small>{v.notes && <p>{v.notes}</p>}{v.evidence_url && <img src={v.evidence_url} alt="Evidencia de visita"/>}<div><button className="primary" disabled={adminBusy} onClick={() => reviewVisit(v.id,'validated')}>Aprobar</button><button className="secondary" disabled={adminBusy} onClick={() => reviewVisit(v.id,'rejected')}>Rechazar</button></div></div>)}{!adminBusy && adminVisits.length===0 && <p className="muted">No hay solicitudes pendientes.</p>}</div>}</div>}
          </>}
        </section>}
      </>}
    </main>

    <nav className="bottom-nav">{navItems.slice(0,2).map(item => {const Icon = item.icon; return <button key={item.id} onClick={() => openTab(item.id)} className={tab === item.id && !selected ? 'active' : ''}><Icon size={20}/><span>{item.label}</span></button>})}<button className="nav-plus" onClick={() => setShowActions(true)} aria-label="Crear o validar"><Plus size={25}/></button>{navItems.slice(2).map(item => {const Icon = item.icon; return <button key={item.id} onClick={() => openTab(item.id)} className={tab === item.id && !selected ? 'active' : ''}><Icon size={20}/><span>{item.label}</span></button>})}</nav>

    {showActions && <div className="modal-backdrop" onClick={() => setShowActions(false)}><div className="action-sheet" onClick={e => e.stopPropagation()}><div className="sheet-handle"/><div className="modal-head"><h2>¿Qué quieres hacer?</h2><button className="icon-button" onClick={() => setShowActions(false)} aria-label="Cerrar"><X/></button></div><button className="action-option" onClick={() => openAction('visit')}><span><ShieldCheck/></span><div><strong>Validar una visita</strong><small>GPS, fotografía o QR presencial</small></div><ChevronRight/></button><button className="action-option" onClick={() => openAction('trip')}><span><Route/></span><div><strong>Crear un viaje</strong><small>Organiza destinos y bitácoras</small></div><ChevronRight/></button><button className="action-option" onClick={() => openAction('post')}><span><Users/></span><div><strong>Publicar en comunidad</strong><small>Comparte una historia o fotografía</small></div><ChevronRight/></button><button className="action-option" onClick={() => {setShowActions(false);setSubview('memories');setTab('profile')}}><span><Images/></span><div><strong>Ver mis recuerdos</strong><small>Revisa tus fotografías</small></div><ChevronRight/></button></div></div>}

    {action && <div className="modal-backdrop" onClick={closeModal}><div className="composer-modal" onClick={e => e.stopPropagation()}><div className="modal-head"><h2>{action === 'visit' ? 'Validar visita' : action === 'trip' ? 'Nuevo viaje' : action === 'memory' ? 'Nuevo recuerdo' : 'Nueva publicación'}</h2><button className="icon-button" onClick={closeModal}><X/></button></div>
      {action === 'visit' && <><p className="muted">Selecciona el destino y el método para registrar tu visita.</p><label>Destino<select value={visitDestination} onChange={e => setVisitDestination(Number(e.target.value))}>{destinations.map(d => <option key={d.id} value={d.id}>{d.title} · {d.region}</option>)}</select></label><div className="method-tabs"><button className={visitMethod==='gps'?'active':''} onClick={()=>setVisitMethod('gps')}><LocateFixed/> GPS</button><button className={visitMethod==='photo'?'active':''} onClick={()=>setVisitMethod('photo')}><Camera/> Foto</button><button className={visitMethod==='qr'?'active':''} onClick={()=>setVisitMethod('qr')}><QrCode/> QR</button></div>{visitMethod==='gps' && <div className="method-panel"><LocateFixed size={28}/><strong>Validación por ubicación</strong><p>Compararemos tu ubicación actual con el área permitida del destino. Activa el GPS y permite el acceso desde el navegador.</p><button className="primary full" disabled={busy} onClick={validateGps}>{busy ? 'Comprobando ubicación…' : 'Comprobar mi ubicación'}</button></div>}{visitMethod==='photo' && <div className="method-panel"><Camera size={28}/><strong>Validación fotográfica</strong><p>Adjunta una fotografía tomada en el destino. La visita quedará pendiente de revisión.</p><label className="file-pick"><ImagePlus/> Seleccionar fotografía<input type="file" accept="image/*" capture="environment" onChange={e=>fileToData(e.target.files?.[0])}/></label>{visitPhoto && <img className="preview-image" src={visitPhoto} alt="Vista previa"/>}<label>Descripción (opcional)<textarea rows={2} value={visitNote} onChange={e=>setVisitNote(e.target.value)} placeholder="Cuéntanos sobre esta visita"/></label><button className="primary full" onClick={submitPhotoVisit}>Enviar evidencia</button></div>}{visitMethod==='qr' && <div className="method-panel"><QrCode size={28}/><strong>Validación presencial</strong><p>Solicita al encargado un QR temporal del destino. Escanéalo con la cámara del teléfono y pega aquí el contenido; vence en 2 minutos y sólo puede utilizarse una vez.</p><button type="button" className="secondary full" onClick={qrScanning ? stopQrScanner : startQrScanner}><Camera size={16}/>{qrScanning ? 'Cerrar cámara' : 'Escanear QR con cámara'}</button>{qrScanning && <video ref={qrVideoRef} className="qr-scanner-video" autoPlay muted playsInline/>}<label>Código del establecimiento<input value={qrManual} onChange={e=>setQrManual(e.target.value)} placeholder='El código aparecerá al escanear'/></label><button className="primary full" disabled={busy} onClick={submitQrCode}>{busy?'Verificando…':'Validar QR presencial'}</button></div>}</>}
      {action === 'trip' && <><p className="muted">Agrupa tus destinos y recuerdos en una expedición.</p><label>Nombre del viaje<input value={tripName} onChange={e=>setTripName(e.target.value)} placeholder="Ej. Ruta a Huaraz"/></label><div className="form-grid trip-date-grid"><label>Fecha de inicio<input className="trip-date-control" type="date" value={tripStart} onChange={e=>setTripStart(e.target.value)}/></label><label>Fecha de fin<input className="trip-date-control" type="date" value={tripEnd} onChange={e=>setTripEnd(e.target.value)}/></label></div><label>Descripción<textarea rows={3} value={tripDescription} onChange={e=>setTripDescription(e.target.value)} placeholder="¿Qué esperas descubrir?"/></label><details className="trip-stops"><summary>Añadir paradas o destinos (opcional) <span>{tripDestinations.length+tripManualStops.length ? (tripDestinations.length+tripManualStops.length)+' paradas' : 'Sin paradas'}</span></summary><p className="muted tiny">Añade las paradas en el orden en que realizarás el recorrido.</p><label>Buscar y añadir destino<input type="search" value={tripStopSelection} onChange={e=>setTripStopSelection(e.target.value)} placeholder="Escribe el nombre, ciudad o región…"/></label><div className="trip-destination-options">{destinations.filter(d=>!tripDestinations.includes(d.id) && `${d.title} ${d.city} ${d.region} ${d.province}`.toLowerCase().includes(tripStopSelection.toLowerCase())).map(d=><button type="button" className="trip-destination-option" key={d.id} onClick={()=>{setTripDestinations(v=>[...v,d.id]);setTripStopSelection('')}}><span><strong>{d.title}</strong><small>{d.city}, {d.province} · {d.region}</small></span><Plus size={17}/></button>)}{tripStopSelection.trim() && destinations.every(d=>d.title.toLowerCase()!==tripStopSelection.trim().toLowerCase()) && <p className="muted tiny">¿No aparece? Puedes agregar “{tripStopSelection.trim()}” como parada manual abajo.</p>}</div><div className="trip-stop-manual"><label>¿No aparece? Añadir parada manual<input value={tripManualStop} onChange={e=>setTripManualStop(e.target.value)} placeholder="Ej. Mirador, grifo, restaurante…"/></label><button type="button" className="secondary" onClick={()=>{const value=tripManualStop.trim();if(value && !tripManualStops.some(x=>x.toLowerCase()===value.toLowerCase()))setTripManualStops(v=>[...v,value]);setTripManualStop('')}}>Añadir parada</button></div>{(tripDestinations.length>0 || tripManualStops.length>0) && <ol className="trip-stop-list">{tripDestinations.map((id,index)=>{const d=destinations.find(x=>x.id===id);return d?<li key={id}><span>{index+1}. {d.title} <small>{d.city}, {d.region}</small></span><button type="button" aria-label="Quitar parada" onClick={()=>setTripDestinations(v=>v.filter(x=>x!==id))}>×</button></li>:null})}{tripManualStops.map((name,index)=><li key={name}><span>{tripDestinations.length+index+1}. {name} <small>Parada manual</small></span><button type="button" aria-label="Quitar parada" onClick={()=>setTripManualStops(v=>v.filter(x=>x!==name))}>×</button></li>)}</ol>}</details><label>Privacidad<select value={tripVisibility} onChange={e=>setTripVisibility(e.target.value as 'public'|'followers'|'private')}><option value="private">Privado · Solo yo</option><option value="followers">Seguidores · Solo quienes me siguen</option><option value="public">Público · Toda la comunidad</option></select></label><button className="primary full" onClick={createTrip}>Crear viaje <Route size={17}/></button></>}
      {(action === 'post' || action === 'memory') && <><p className="muted">Comparte una experiencia con la comunidad o guarda un recuerdo privado.</p><label>Título<input value={postTitle} onChange={e=>setPostTitle(e.target.value)} placeholder="Ej. Una ruta inolvidable"/></label><label>Tu historia<textarea rows={4} value={postText} onChange={e=>setPostText(e.target.value)} placeholder="Describe el recorrido, los paisajes y lo que viviste…"/></label><label>Destino relacionado<select value={postPlace} onChange={e=>setPostPlace(e.target.value)}><option value="">Seleccionar destino</option>{destinations.map(d=><option key={d.id} value={`${d.city}, ${d.region}`}>{d.title}</option>)}</select></label><label className="file-pick"><ImagePlus/> Añadir fotografía<input type="file" accept="image/*" onChange={e=>postFileToData(e.target.files?.[0])}/></label>{postImage && <img className="preview-image" src={postImage} alt="Vista previa"/>}<label>Visibilidad<select value={postVisibility} onChange={e=>setPostVisibility(e.target.value as 'public'|'followers'|'private')}><option value="public">Pública · Comunidad</option><option value="followers">Seguidores</option><option value="private">Privada · Solo yo</option></select></label><button className="primary full" disabled={busy} onClick={publishPost}>{busy ? 'Publicando…' : postVisibility==='private' ? 'Guardar recuerdo' : 'Publicar experiencia'} <Send size={17}/></button></>}
    </div></div>}

    {authOpen && <div className="modal-backdrop auth-backdrop" onClick={() => setAuthOpen(false)}><div className="composer-modal auth-modal" onClick={e => e.stopPropagation()}><div className="auth-brand"><span className="brand-mark"><Bike size={25}/></span><span><strong>PASAPORTE MOTERO</strong><small>RUTAS · HISTORIAS · DESTINOS</small></span></div><div className="modal-head"><h2>{authMode === 'login' ? 'Bienvenido de nuevo' : 'Únete a la ruta'}</h2><button className="icon-button" onClick={() => setAuthOpen(false)}><X/></button></div><p className="muted">Tu cuenta permitirá sincronizar el pasaporte, los viajes y las publicaciones entre dispositivos.</p><div className="social-auth"><button className="google-auth-button" type="button" disabled={authBusy || !supabase} onClick={()=>startOAuth('google')}><b className="google-mark">G</b><span>{authBusy ? 'Conectando…' : 'Continuar con Google'}</span></button></div><div className="auth-divider"><span/> o continúa con correo electrónico <span/></div><div className="feed-switch"><button className={authMode==='login'?'active':''} onClick={()=>setAuthMode('login')}>Iniciar sesión</button><button className={authMode==='register'?'active':''} onClick={()=>setAuthMode('register')}>Registrarme</button></div><label>Correo electrónico<input type="email" autoComplete="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="correo@ejemplo.com"/></label>{authMode === 'register' && <><label>Nombre completo<input autoComplete="name" value={registerName} onChange={e=>setRegisterName(e.target.value)} placeholder="Tu nombre y apellidos"/></label><label>Nombre de usuario<input autoComplete="username" value={registerUsername} onChange={e=>setRegisterUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g,''))} placeholder="Ej. viajero_motero"/></label><label>Ciudad o región<input autoComplete="address-level2" value={registerCity} onChange={e=>setRegisterCity(e.target.value)} placeholder="Ej. Huancayo, Junín"/></label><label>Motocicleta (opcional)<input value={registerMotorcycle} onChange={e=>setRegisterMotorcycle(e.target.value)} placeholder="Marca y modelo"/></label></>}<label>Contraseña<input type="password" autoComplete={authMode==='login'?'current-password':'new-password'} minLength={8} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="Mínimo 8 caracteres"/></label><button className="primary full" disabled={authBusy || !isSupabaseConfigured} onClick={submitAuth}>{authBusy ? 'Procesando…' : authMode==='login' ? 'Iniciar sesión' : 'Crear cuenta'}</button><p className="auth-provider-note">Acceso seguro con tu cuenta de Google. El proveedor debe estar habilitado en Supabase.</p>{!isSupabaseConfigured && <p className="auth-note">Supabase todavía no está conectado. Esta pantalla queda preparada, pero el acceso real se habilitará al configurar la URL pública y la clave anon del proyecto.</p>}</div></div>}

    {commentPost !== null && <div className="modal-backdrop" onClick={()=>setCommentPost(null)}><div className="composer-modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>Comentarios</h2><button className="icon-button" onClick={()=>setCommentPost(null)}><X/></button></div><div className="comments-list">{posts.find(p=>p.id===commentPost)?.comments.map((c,i)=><p key={i}>{c}</p>)}</div><label>Escribe un comentario<textarea rows={3} value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Tu comentario…"/></label><button className="primary full" onClick={addComment}>Enviar comentario <Send size={16}/></button></div></div>}
    {notice && <button className="toast" onClick={()=>setNotice('')}><CheckCircle2 size={16}/>{notice}<b>×</b></button>}
  </div>
}
