// Datos pequeños y a mano para probar el servicio y el almacén Excel (no es un archivo de pruebas).
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { Contacto, DatosMedicinas, LoteMedicamento, Medicamento } from '../../src/medicinas/tipos.js'
import { sumarDias } from '../../src/medicinas/fechas.js'

/** Miércoles 28 de octubre de 2026, 3:00 p. m. en Bogotá */
export const AHORA = new Date('2026-10-28T15:00:00-05:00')
export const HOY = '2026-10-28'
export const dia = (n: number) => sumarDias(HOY, n)

export function med(id: string, nombre: string, extra: Partial<Medicamento> = {}): Medicamento {
  return {
    id,
    nombre,
    alias: [],
    principioActivo: nombre.toLowerCase(),
    categoria: 'otro',
    presentacion: '',
    unidad: 'tableta',
    especies: ['perro', 'gato'],
    usoComun: '',
    dosisReferencia: '',
    contraindicaciones: '',
    requiereFormula: false,
    stockMinimo: 0,
    proveedorId: null,
    precioUnitarioCOP: 0,
    ...extra,
  }
}

export function lote(id: string, medicamentoId: string, venceDias: number, cantidad: number): LoteMedicamento {
  return { id, medicamentoId, numeroLote: `N-${id}`, vence: dia(venceDias), cantidad, ingreso: dia(-30) }
}

export function contacto(id: string, tipo: Contacto['tipo'], nombre: string, activo = true): Contacto {
  return { id, tipo, nombre, telefono: '573005550100', correo: `${id}@example.com`, ciudad: 'Medellín', nota: '', activo }
}

export function datosDePrueba(): DatosMedicinas {
  return {
    medicamentos: [
      med('amox', 'Amoxicilina', {
        alias: ['Amoxi', 'Clamoxyl'],
        principioActivo: 'Amoxicilina trihidrato',
        categoria: 'antibiotico',
        presentacion: 'Suspensión oral 250 mg/5 ml, frasco 60 ml',
        unidad: 'frasco',
        usoComun: 'Infecciones de piel y respiratorias',
        stockMinimo: 3,
        proveedorId: 'prov1',
        precioUnitarioCOP: 28500,
      }),
      med('amox-clav', 'Amoxicilina + ácido clavulánico', { categoria: 'antibiotico', stockMinimo: 10 }),
      med('melox', 'Meloxicam', {
        alias: ['Metacam'],
        categoria: 'antiinflamatorio',
        usoComun: 'Dolor e inflamación de articulaciones',
        stockMinimo: 20,
      }),
      med('feno', 'Fenobarbital', {
        categoria: 'anticonvulsivante',
        usoComun: 'Control de convulsiones y epilepsia',
        requiereFormula: true,
        stockMinimo: 30,
      }),
      med('tram', 'Tramadol', { categoria: 'analgesico', usoComun: 'Dolor intenso', stockMinimo: 10 }),
      med('ivm', 'Ivermectina', {
        categoria: 'antiparasitario',
        usoComun: 'Sarna, pulgas y parásitos',
        unidad: 'frasco',
        stockMinimo: 2,
      }),
      med('keto', 'Ketoconazol', { categoria: 'dermatologico', usoComun: 'Hongos en la piel', stockMinimo: 5 }),
      med('gotas', 'Gotas oftálmicas', {
        alias: ['Gotas para los ojos'],
        categoria: 'oftalmico',
        presentacion: 'Frasco gotero 10 ml',
        unidad: 'frasco',
        stockMinimo: 1,
      }),
      med('champu', 'Champú de clorhexidina', {
        alias: ['Champú medicado'],
        categoria: 'dermatologico',
        presentacion: 'Frasco 250 ml',
        unidad: 'frasco',
        stockMinimo: 1,
      }),
      med('vit', 'Vitaminas', {
        categoria: 'vitamina',
        presentacion: 'Jarabe multivitamínico, frasco 120 ml',
        unidad: 'frasco',
        stockMinimo: 1,
      }),
      med('compl-b', 'Complejo B', { alias: ['Complejo vitamínico B'], categoria: 'vitamina', stockMinimo: 1 }),
    ],
    lotes: [
      lote('l1', 'amox', 40, 2),
      lote('l2', 'amox', -5, 10), // vencido: no cuenta
      lote('l3', 'amox-clav', 200, 50),
      lote('l4', 'melox', 100, 100),
      lote('l5', 'feno', 300, 90),
      lote('l6', 'tram', 150, 50),
      lote('l7', 'ivm', 25, 12),
      lote('l8', 'gotas', 90, 2),
      lote('l9', 'champu', 90, 3),
      lote('l10', 'vit', 90, 4),
      lote('l11', 'compl-b', 90, 4),
      lote('l12', 'keto', -3, 8), // solo vencido: stock 0
    ],
    contactos: [
      contacto('prov1', 'proveedor', 'Droguería Veterinaria El Cachorro'),
      contacto('cli1', 'clinica', 'Clínica Veterinaria San Roque'),
      contacto('pad1', 'padrino', 'Marta Ríos'),
      contacto('pad2', 'padrino', 'Jorge Peña', false),
    ],
  }
}

/** Carpeta temporal fuera del repositorio; devuelve su ruta y una función para borrarla. */
export async function carpetaTemporal(): Promise<{ dir: string; limpiar: () => Promise<void> }> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'medicinas-'))
  return { dir, limpiar: () => fs.rm(dir, { recursive: true, force: true }) }
}
