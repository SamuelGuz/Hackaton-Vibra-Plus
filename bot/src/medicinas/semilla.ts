// Datos de demostración del inventario de medicinas.
// TODO ES FICTICIO: nombres, teléfonos (573005550xxx, con "555" a propósito), correos (@example.com), lotes, cantidades
// y precios son inventados para probar y mostrar el sistema; no representan a nadie real ni al inventario del albergue.
//
// Las fechas son RELATIVAS a `ahora` para que cualquier día de la demo haya lotes ya vencidos, lotes que vencen pronto,
// medicamentos con poco stock y uno en cero. Es determinista: la misma `ahora` da siempre los mismos datos.
// Incluye todos los medicamentos que nombran los tratamientos de scripts/semilla.ts (Amoxicilina, Meloxicam,
// Desparasitante, Gotas para los ojos, Antibiótico, Vitaminas, Fenobarbital y el champú medicado) para que
// diasDeStock() los enlace.

import { hoyBogota, sumarDias } from './fechas.js'
import { normalizar } from './texto.js'
import type { CategoriaMedicamento, Contacto, DatosMedicinas, LoteMedicamento, Medicamento, TipoContacto, UnidadMedicamento } from './tipos.js'

interface DefMedicamento {
  id: string
  nombre: string
  alias?: string[]
  principio: string
  categoria: CategoriaMedicamento
  presentacion: string
  unidad: UnidadMedicamento
  especies?: ('perro' | 'gato')[]
  uso: string
  dosis: string
  contra: string
  formula?: boolean
  minimo: number
  proveedor: string
  precio: number
  /** [días hasta vencer (negativo = ya vencido), cantidad] por lote */
  lotes: [number, number][]
}

const MEDICAMENTOS: DefMedicamento[] = [
  {
    id: 'amoxicilina', nombre: 'Amoxicilina', alias: ['Amoxi', 'Amoxicilina suspensión'], principio: 'Amoxicilina trihidrato',
    categoria: 'antibiotico', presentacion: 'Suspensión oral 250 mg/5 ml, frasco 60 ml', unidad: 'frasco',
    uso: 'Infecciones de piel, heridas, vías respiratorias y urinarias', dosis: '10-20 mg/kg cada 12 horas, según indicación veterinaria',
    contra: 'Alergia a penicilinas; precaución en conejos y cobayos', minimo: 4, proveedor: 'prov-01', precio: 28500,
    lotes: [[-12, 1], [95, 1], [210, 1]], // un lote vencido: queda stock 2, por debajo del mínimo
  },
  {
    id: 'amoxicilina-clavulanico', nombre: 'Amoxicilina + ácido clavulánico', alias: ['Clavulanato', 'Amox clav'],
    principio: 'Amoxicilina y ácido clavulánico', categoria: 'antibiotico', presentacion: 'Tabletas 500 mg, caja x 14', unidad: 'tableta',
    uso: 'Infecciones profundas de piel, abscesos, mordidas', dosis: '12,5-25 mg/kg cada 12 horas',
    contra: 'Alergia a penicilinas', minimo: 28, proveedor: 'prov-01', precio: 3800, lotes: [[150, 42], [300, 56]],
  },
  {
    id: 'meloxicam', nombre: 'Meloxicam', alias: ['Metacam'], principio: 'Meloxicam',
    categoria: 'antiinflamatorio', presentacion: 'Tabletas 7,5 mg', unidad: 'tableta',
    uso: 'Dolor e inflamación de articulaciones, después de cirugías', dosis: '0,1 mg/kg una vez al día con comida',
    contra: 'Insuficiencia renal o hepática, úlceras, no combinar con otros antiinflamatorios', minimo: 40, proveedor: 'prov-01', precio: 2900,
    lotes: [[180, 60], [330, 100]],
  },
  {
    id: 'fenobarbital', nombre: 'Fenobarbital', alias: ['Luminal'], principio: 'Fenobarbital',
    categoria: 'anticonvulsivante', presentacion: 'Tabletas 100 mg', unidad: 'tableta', especies: ['perro', 'gato'],
    uso: 'Control de convulsiones y epilepsia', dosis: '2-4 mg/kg cada 12 horas; no suspender de golpe',
    contra: 'Enfermedad hepática grave; vigilar somnolencia', formula: true, minimo: 60, proveedor: 'cli-01', precio: 1500,
    lotes: [[120, 90], [365, 120]],
  },
  {
    id: 'ivermectina', nombre: 'Ivermectina', alias: ['Ivomec'], principio: 'Ivermectina', categoria: 'antiparasitario',
    presentacion: 'Solución inyectable 1 %, frasco 50 ml', unidad: 'frasco',
    uso: 'Sarna, ácaros de oído y parásitos externos', dosis: '0,2-0,4 mg/kg bajo control veterinario',
    contra: 'Razas con mutación MDR1 (collie, pastor): no usar sin examen', minimo: 2, proveedor: 'prov-01', precio: 54000,
    lotes: [[25, 1], [240, 2]],
  },
  {
    id: 'praziquantel-pirantel', nombre: 'Praziquantel + pirantel', alias: ['Desparasitante', 'Desparasitante interno'],
    principio: 'Praziquantel y pamoato de pirantel', categoria: 'antiparasitario', presentacion: 'Tabletas masticables, caja x 10',
    unidad: 'tableta', uso: 'Lombrices y tenias en perros y gatos adultos', dosis: '1 tableta por cada 10 kg, repetir a los 15 días',
    contra: 'Cachorros menores de 2 semanas', minimo: 30, proveedor: 'prov-01', precio: 4200, lotes: [[200, 50], [400, 80]],
  },
  {
    id: 'metronidazol', nombre: 'Metronidazol', principio: 'Metronidazol', categoria: 'antibiotico', presentacion: 'Tabletas 250 mg',
    unidad: 'tableta', uso: 'Diarrea, giardia e infecciones intestinales', dosis: '10-15 mg/kg cada 12 horas',
    contra: 'Gestación; no usar más de 7 días seguidos', minimo: 30, proveedor: 'prov-05', precio: 900, lotes: [[-40, 15], [120, 40]],
  },
  {
    id: 'doxiciclina', nombre: 'Doxiciclina', principio: 'Doxiciclina', categoria: 'antibiotico', presentacion: 'Tabletas 100 mg',
    unidad: 'tableta', uso: 'Enfermedades transmitidas por garrapatas, infecciones respiratorias', dosis: '5-10 mg/kg cada 12-24 horas',
    contra: 'Cachorros en crecimiento, gestación', minimo: 20, proveedor: 'prov-01', precio: 1700, lotes: [[12, 18], [260, 40]],
  },
  {
    id: 'enrofloxacina', nombre: 'Enrofloxacina', alias: ['Antibiótico', 'Baytril', 'Enro'], principio: 'Enrofloxacina',
    categoria: 'antibiotico', presentacion: 'Solución oral 50 mg/ml, frasco 20 ml', unidad: 'frasco',
    uso: 'Infecciones bacterianas de piel, urinarias y respiratorias', dosis: '5 mg/kg una vez al día',
    contra: 'Cachorros en crecimiento; en gatos no pasar de 5 mg/kg (riesgo en los ojos)', minimo: 2, proveedor: 'prov-01', precio: 38000,
    lotes: [[60, 1], [180, 0]], // stock bajo el mínimo; el segundo lote ya se gastó
  },
  {
    id: 'prednisolona', nombre: 'Prednisolona', principio: 'Prednisolona', categoria: 'antiinflamatorio', presentacion: 'Tabletas 5 mg',
    unidad: 'tableta', uso: 'Alergias, inflamación fuerte y problemas inmunes', dosis: '0,5-1 mg/kg, bajar de a poco',
    contra: 'Infecciones sin tratar, úlceras, diabetes', minimo: 30, proveedor: 'prov-02', precio: 700, lotes: [[150, 60], [310, 60]],
  },
  {
    id: 'omeprazol', nombre: 'Omeprazol', principio: 'Omeprazol', categoria: 'otro', presentacion: 'Cápsulas 20 mg',
    unidad: 'tableta', uso: 'Protector de estómago, gastritis y vómito', dosis: '0,5-1 mg/kg una vez al día en ayunas',
    contra: 'Precaución en enfermedad hepática', minimo: 20, proveedor: 'prov-02', precio: 800, lotes: [[28, 30], [270, 50]],
  },
  {
    id: 'tramadol', nombre: 'Tramadol', principio: 'Clorhidrato de tramadol', categoria: 'analgesico', presentacion: 'Tabletas 50 mg',
    unidad: 'tableta', uso: 'Dolor moderado a intenso, después de cirugías o fracturas', dosis: '2-4 mg/kg cada 8-12 horas',
    contra: 'Epilepsia, no combinar con sedantes sin control', formula: true, minimo: 20, proveedor: 'cli-01', precio: 1900,
    lotes: [[200, 40], [400, 60]],
  },
  {
    id: 'dipirona', nombre: 'Dipirona', alias: ['Metamizol', 'Novalgina'], principio: 'Dipirona sódica', categoria: 'analgesico',
    presentacion: 'Solución inyectable 1 g/2 ml, ampolla', unidad: 'ampolla', uso: 'Fiebre y dolor leve a moderado', dosis: '25 mg/kg cada 8-12 horas',
    contra: 'Alteraciones de la sangre, deshidratación', minimo: 10, proveedor: 'prov-02', precio: 3200, lotes: [[90, 25], [300, 40]],
  },
  {
    id: 'complejo-b', nombre: 'Complejo B', alias: ['Vitamina B'], principio: 'Vitaminas del complejo B', categoria: 'vitamina',
    presentacion: 'Solución inyectable, frasco 10 ml', unidad: 'frasco', uso: 'Falta de apetito, debilidad y recuperación', dosis: '0,5-1 ml según peso',
    contra: 'Ninguna conocida a dosis normales', minimo: 2, proveedor: 'prov-02', precio: 21000, lotes: [[-3, 2], [150, 3]],
  },
  {
    id: 'vitaminas', nombre: 'Vitaminas', alias: ['Multivitamínico'], principio: 'Multivitamínico con minerales', categoria: 'vitamina',
    presentacion: 'Jarabe multivitamínico, frasco 120 ml', unidad: 'frasco', uso: 'Defensas bajas, desnutrición y cachorros débiles',
    dosis: '5 ml al día', contra: 'Evitar exceso en cachorros de razas grandes', minimo: 3, proveedor: 'prov-02', precio: 26000,
    lotes: [[200, 4], [380, 5]],
  },
  {
    id: 'ringer-lactato', nombre: 'Suero Ringer lactato', alias: ['Suero', 'Ringer'], principio: 'Solución de Ringer lactato', categoria: 'suero',
    presentacion: 'Bolsa 500 ml', unidad: 'frasco', uso: 'Deshidratación, vómito y diarrea fuertes', dosis: '20-40 ml/kg al día por vena o bajo la piel',
    contra: 'Insuficiencia cardiaca; vigilar el goteo', minimo: 10, proveedor: 'prov-02', precio: 9500, lotes: [[8, 6], [180, 14]],
  },
  {
    id: 'gotas-oftalmicas', nombre: 'Gotas oftálmicas', alias: ['Gotas para los ojos', 'Colirio'], principio: 'Cloranfenicol', categoria: 'oftalmico',
    presentacion: 'Frasco gotero 10 ml', unidad: 'frasco', uso: 'Conjuntivitis, secreción y ojos irritados', dosis: '1-2 gotas cada 6-8 horas',
    contra: 'Úlceras profundas de córnea sin control del veterinario', minimo: 3, proveedor: 'prov-03', precio: 18000, lotes: [[140, 4], [320, 3]],
  },
  {
    id: 'champu-clorhexidina', nombre: 'Champú de clorhexidina', alias: ['Champú medicado', 'Baño medicado'], principio: 'Clorhexidina 4 %',
    categoria: 'dermatologico', presentacion: 'Frasco 250 ml', unidad: 'frasco', uso: 'Dermatitis, bacterias y hongos en la piel',
    dosis: 'Baño cada 2-3 días, dejar actuar 10 minutos', contra: 'No usar cerca de los ojos', minimo: 3, proveedor: 'prov-03', precio: 42000,
    lotes: [[220, 5], [400, 4]],
  },
  {
    id: 'ketoconazol', nombre: 'Ketoconazol', principio: 'Ketoconazol', categoria: 'dermatologico', presentacion: 'Tabletas 200 mg',
    unidad: 'tableta', uso: 'Hongos en la piel y tiña', dosis: '5-10 mg/kg una vez al día con comida',
    contra: 'Enfermedad hepática, gestación', minimo: 20, proveedor: 'cli-02', precio: 2400, lotes: [[-70, 12], [300, 30]],
  },
  {
    id: 'vacuna-sextuple', nombre: 'Vacuna séxtuple canina', alias: ['Séxtuple', 'Vacuna puppy'], principio: 'Virus vivos atenuados (moquillo, parvovirus, hepatitis, parainfluenza, leptospira)',
    categoria: 'vacuna', presentacion: 'Dosis única, jeringa prellenada', unidad: 'dosis', especies: ['perro'], uso: 'Prevención de moquillo, parvovirus y otras enfermedades',
    dosis: '1 dosis a partir de las 6-8 semanas, refuerzos cada 3-4 semanas y anual', contra: 'Animales enfermos o con fiebre', minimo: 10, proveedor: 'prov-04', precio: 38000,
    lotes: [[60, 14], [150, 20]],
  },
  {
    id: 'vacuna-antirrabica', nombre: 'Vacuna antirrábica', alias: ['Rabia'], principio: 'Virus inactivado de la rabia', categoria: 'vacuna',
    presentacion: 'Dosis única, frasco monodosis', unidad: 'dosis', uso: 'Prevención de la rabia en perros y gatos', dosis: '1 dosis desde los 3 meses, refuerzo anual',
    contra: 'Animales enfermos o con fiebre', minimo: 10, proveedor: 'prov-04', precio: 15000, lotes: [[180, 30], [300, 25]],
  },
  {
    id: 'vacuna-triple-felina', nombre: 'Vacuna triple felina', alias: ['Triple felina'], principio: 'Panleucopenia, rinotraqueítis y calicivirus', categoria: 'vacuna',
    presentacion: 'Dosis única, jeringa prellenada', unidad: 'dosis', especies: ['gato'], uso: 'Prevención de enfermedades respiratorias y panleucopenia en gatos',
    dosis: '1 dosis desde las 8 semanas, refuerzo a las 3-4 semanas y anual', contra: 'Gatas gestantes, animales enfermos', minimo: 8, proveedor: 'prov-04', precio: 45000,
    lotes: [[-20, 6], [140, 9]],
  },
  {
    id: 'desparasitante-cachorros', nombre: 'Desparasitante para cachorros', alias: ['Pirantel suspensión'], principio: 'Pamoato de pirantel',
    categoria: 'antiparasitario', presentacion: 'Suspensión oral, frasco 20 ml', unidad: 'frasco', uso: 'Lombrices en cachorros y gatitos',
    dosis: '1 ml por cada 2 kg, repetir a los 15 días', contra: 'Animales muy debilitados sin valoración', minimo: 3, proveedor: 'prov-01', precio: 16000,
    lotes: [[110, 4], [260, 6]],
  },
  {
    id: 'cefalexina', nombre: 'Cefalexina', principio: 'Cefalexina monohidrato', categoria: 'antibiotico', presentacion: 'Cápsulas 500 mg',
    unidad: 'tableta', uso: 'Piodermas e infecciones de piel y tejidos blandos', dosis: '20-30 mg/kg cada 12 horas',
    contra: 'Alergia a cefalosporinas o penicilinas', minimo: 30, proveedor: 'prov-05', precio: 1600, lotes: [[170, 60], [330, 60]],
  },
  {
    id: 'furosemida', nombre: 'Furosemida', principio: 'Furosemida', categoria: 'otro', presentacion: 'Tabletas 40 mg', unidad: 'tableta',
    uso: 'Diurético para problemas del corazón y líquido en los pulmones', dosis: '1-4 mg/kg cada 8-24 horas',
    contra: 'Deshidratación, falta de orina', formula: true, minimo: 20, proveedor: 'cli-01', precio: 600, lotes: [[75, 12], [210, 0]],
  },
  {
    id: 'gabapentina', nombre: 'Gabapentina', principio: 'Gabapentina', categoria: 'analgesico', presentacion: 'Cápsulas 100 mg', unidad: 'tableta',
    uso: 'Dolor de nervios, dolor crónico y apoyo en convulsiones', dosis: '5-10 mg/kg cada 8-12 horas',
    contra: 'Insuficiencia renal; puede dar sueño', formula: true, minimo: 30, proveedor: 'cli-01', precio: 1800, lotes: [[200, 40], [340, 60]],
  },
  {
    id: 'maropitant', nombre: 'Maropitant', alias: ['Cerenia'], principio: 'Citrato de maropitant', categoria: 'otro', presentacion: 'Tabletas 16 mg',
    unidad: 'tableta', uso: 'Antivómito y náuseas', dosis: '2 mg/kg una vez al día, máximo 5 días',
    contra: 'Cachorros menores de 8 semanas', minimo: 10, proveedor: 'cli-02', precio: 12500, lotes: [[-30, 10], [90, 0]], // sin stock
  },
  {
    id: 'probiotico', nombre: 'Probiótico', alias: ['Probióticos'], principio: 'Lactobacilos y enterococos', categoria: 'otro',
    presentacion: 'Sobres de 1 g, caja x 30', unidad: 'sobre', uso: 'Flora intestinal, diarrea y después de antibióticos', dosis: '1 sobre al día mezclado con el alimento',
    contra: 'Ninguna conocida', minimo: 20, proveedor: 'prov-05', precio: 2500, lotes: [[160, 30], [300, 40]],
  },
  {
    id: 'pomada-cicatrizante', nombre: 'Pomada cicatrizante', alias: ['Cicatrizante'], principio: 'Óxido de zinc y vitamina A', categoria: 'dermatologico',
    presentacion: 'Tubo 30 g', unidad: 'tubo', uso: 'Heridas, rasguños y piel irritada', dosis: 'Capa fina una o dos veces al día',
    contra: 'Heridas muy profundas o infectadas sin valoración', minimo: 3, proveedor: 'prov-03', precio: 14500, lotes: [[19, 3], [250, 4]],
  },
  {
    id: 'collar-antipulgas', nombre: 'Collar antipulgas', alias: ['Collar'], principio: 'Flumetrina e imidacloprid', categoria: 'antiparasitario',
    presentacion: 'Collar protección 8 meses', unidad: 'dosis', uso: 'Pulgas y garrapatas', dosis: '1 collar según tamaño del animal',
    contra: 'Cachorros menores de 7 semanas, piel lastimada en el cuello', minimo: 6, proveedor: 'prov-03', precio: 68000, lotes: [[300, 12], [420, 12]],
  },
]

interface DefPersona {
  nombre: string
  ciudad: string
  nota?: string
  activo?: boolean
}

const PROVEEDORES: DefPersona[] = [
  { nombre: 'Droguería Veterinaria El Cachorro', ciudad: 'Medellín', nota: 'Entrega en 24 horas, crédito a 30 días' },
  { nombre: 'Distribuciones VetSalud S.A.S.', ciudad: 'Medellín', nota: 'Pedido mínimo $200.000' },
  { nombre: 'Agroveterinaria La Campiña', ciudad: 'Envigado', nota: 'Descuento por compras mensuales' },
  { nombre: 'Biológicos y Vacunas del Valle', ciudad: 'Cali', nota: 'Vacunas con cadena de frío; pedir los martes' },
  { nombre: 'Droguería Mascotas Felices', ciudad: 'Bello', nota: 'Atiende fines de semana' },
]

const CLINICAS: DefPersona[] = [
  { nombre: 'Clínica Veterinaria San Roque', ciudad: 'Medellín', nota: 'Dra. Salazar firma las fórmulas de medicamentos controlados' },
  { nombre: 'Clínica Veterinaria 24 Horas', ciudad: 'Itagüí', nota: 'Urgencias de noche y festivos' },
]

const PADRINOS: DefPersona[] = [
  { nombre: 'Marta Lucía Ríos', ciudad: 'Medellín', nota: 'Apadrina a Mateo desde marzo' },
  { nombre: 'Jorge Iván Peña', ciudad: 'Envigado', nota: 'Aporta $30.000 mensuales' },
  { nombre: 'Catalina Mejía', ciudad: 'Sabaneta', nota: 'Apadrina a Luna' },
  { nombre: 'Andrés Felipe Cardona', ciudad: 'Bogotá' },
  { nombre: 'Paola Andrea Gil', ciudad: 'Medellín', nota: 'Apadrina a Bruno' },
  { nombre: 'Sergio Alejandro Muñoz', ciudad: 'Itagüí', activo: false, nota: 'Pausó el apadrinamiento' },
  { nombre: 'Luz Marina Ospina', ciudad: 'Bello' },
  { nombre: 'Camilo Hernández', ciudad: 'Cali', nota: 'Apadrina a Tigre' },
  { nombre: 'Daniela Restrepo', ciudad: 'Medellín' },
  { nombre: 'Julián David Arango', ciudad: 'La Estrella', nota: 'Apadrina a Pecas' },
]

const DONANTES: DefPersona[] = [
  { nombre: 'Fundación Amigos del Barrio', ciudad: 'Medellín', nota: 'Dona alimento cada trimestre' },
  { nombre: 'Natalia Zapata', ciudad: 'Envigado', nota: 'Dona medicinas vigentes' },
  { nombre: 'Ricardo Echeverri', ciudad: 'Medellín' },
  { nombre: 'Panadería La Espiga', ciudad: 'Bello', nota: 'Dona pan y aportes en efectivo' },
  { nombre: 'Gloria Patricia Londoño', ciudad: 'Sabaneta' },
  { nombre: 'Tienda Mascotas Alegres', ciudad: 'Medellín', nota: 'Dona bultos con empaque dañado' },
  { nombre: 'Mauricio Tobón', ciudad: 'Rionegro', activo: false },
  { nombre: 'Laura Sofía Giraldo', ciudad: 'Medellín' },
  { nombre: 'Colegio San Ignacio', ciudad: 'Medellín', nota: 'Campaña anual de recolección' },
  { nombre: 'Hernán Darío Builes', ciudad: 'Itagüí' },
]

const ADOPTANTES: DefPersona[] = [
  { nombre: 'Verónica Montoya', ciudad: 'Medellín', nota: 'Adoptó a Canela' },
  { nombre: 'Esteban Vélez', ciudad: 'Envigado', nota: 'Adoptó a Rocky; seguimiento a los 3 meses' },
  { nombre: 'Isabel Cristina Duque', ciudad: 'Sabaneta' },
  { nombre: 'Felipe Ocampo', ciudad: 'Medellín', nota: 'Adoptó a Misu' },
  { nombre: 'Carolina Agudelo', ciudad: 'Bello' },
  { nombre: 'Santiago Escobar', ciudad: 'Itagüí', nota: 'Visita de seguimiento pendiente' },
  { nombre: 'Diana Marcela Ruiz', ciudad: 'Medellín', activo: false, nota: 'Se mudó de ciudad' },
  { nombre: 'Tomás Bedoya', ciudad: 'La Estrella' },
  { nombre: 'Juliana Cárdenas', ciudad: 'Medellín', nota: 'Adoptó a Salem' },
  { nombre: 'Óscar Mauricio Franco', ciudad: 'Envigado' },
]

const VOLUNTARIOS: DefPersona[] = [
  { nombre: 'Sara Valentina Correa', ciudad: 'Medellín', nota: 'Sábados en la mañana, paseos' },
  { nombre: 'Miguel Ángel Toro', ciudad: 'Envigado', nota: 'Ayuda con baños y limpieza' },
  { nombre: 'Lina María Cano', ciudad: 'Medellín', nota: 'Estudiante de veterinaria, apoya curaciones' },
  { nombre: 'David Alejandro Soto', ciudad: 'Bello' },
  { nombre: 'Mariana Posada', ciudad: 'Sabaneta', nota: 'Fotografía de los animales' },
  { nombre: 'Cristian Camilo Henao', ciudad: 'Itagüí', activo: false, nota: 'Retirado por tiempo' },
  { nombre: 'Valeria Quintero', ciudad: 'Medellín', nota: 'Domingos, traslados al veterinario' },
  { nombre: 'Nicolás Salazar', ciudad: 'Medellín' },
]

function contactos(tipo: TipoContacto, prefijo: string, lista: DefPersona[], inicioTelefono: number): Contacto[] {
  return lista.map((p, i) => {
    const n = String(i + 1).padStart(2, '0')
    const correo = normalizar(p.nombre).split(' ').slice(0, 2).join('.')
    return {
      id: `${prefijo}-${n}`,
      tipo,
      nombre: p.nombre,
      // 573005550xxx: el "555" marca el número como inventado
      telefono: `57300555${String(inicioTelefono + i).padStart(4, '0')}`,
      correo: `${correo}@example.com`,
      ciudad: p.ciudad,
      nota: p.nota ?? '',
      activo: p.activo ?? true,
    }
  })
}

export function semillaMedicinas(ahora: Date): DatosMedicinas {
  const hoy = hoyBogota(ahora)
  const dia = (n: number) => sumarDias(hoy, n)

  const medicamentos: Medicamento[] = []
  const lotes: LoteMedicamento[] = []
  let consecutivo = 0
  MEDICAMENTOS.forEach((d, i) => {
    medicamentos.push({
      id: d.id,
      nombre: d.nombre,
      alias: d.alias ?? [],
      principioActivo: d.principio,
      categoria: d.categoria,
      presentacion: d.presentacion,
      unidad: d.unidad,
      especies: d.especies ?? ['perro', 'gato'],
      usoComun: d.uso,
      dosisReferencia: d.dosis,
      contraindicaciones: d.contra,
      requiereFormula: d.formula ?? false,
      stockMinimo: d.minimo,
      proveedorId: d.proveedor,
      precioUnitarioCOP: d.precio,
    })
    d.lotes.forEach(([vence, cantidad], j) => {
      consecutivo++
      lotes.push({
        id: `lote-${String(consecutivo).padStart(3, '0')}`,
        medicamentoId: d.id,
        numeroLote: `${d.id.slice(0, 3).toUpperCase()}-${26}${String(10 + ((i * 7 + j * 3) % 90)).padStart(2, '0')}`,
        vence: dia(vence),
        cantidad,
        // Entró entre 1 y 6 meses antes de hoy y siempre 20 días o más antes de vencer
        ingreso: dia(Math.min(-(25 + ((i * 17 + j * 41) % 150)), vence - 20)),
      })
    })
  })

  return {
    medicamentos,
    lotes,
    contactos: [
      ...contactos('proveedor', 'prov', PROVEEDORES, 100),
      ...contactos('clinica', 'cli', CLINICAS, 200),
      ...contactos('padrino', 'pad', PADRINOS, 300),
      ...contactos('donante', 'don', DONANTES, 400),
      ...contactos('adoptante', 'ado', ADOPTANTES, 500),
      ...contactos('voluntario', 'vol', VOLUNTARIOS, 600),
    ],
  }
}
