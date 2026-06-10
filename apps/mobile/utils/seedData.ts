// Seed data for the syllabus feature
// 3 subjects × 3 chapters × 4 tasks = 36 tasks

import type { Subject } from '../../packages/shared/types';

export function generateSeedData(): Subject[] {
  return [
    {
      id: 'sub-math',
      name: 'Mathematics',
      chapters: [
        {
          id: 'ch-math-1',
          subjectId: 'sub-math',
          name: 'Algebra',
          tasks: [
            { id: 'task-m1-1', chapterId: 'ch-math-1', title: 'Linear Equations', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-m1-2', chapterId: 'ch-math-1', title: 'Quadratic Equations', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-m1-3', chapterId: 'ch-math-1', title: 'Polynomials', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-m1-4', chapterId: 'ch-math-1', title: 'Factorization', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
          ],
        },
        {
          id: 'ch-math-2',
          subjectId: 'sub-math',
          name: 'Geometry',
          tasks: [
            { id: 'task-m2-1', chapterId: 'ch-math-2', title: 'Triangles', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-m2-2', chapterId: 'ch-math-2', title: 'Circles', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-m2-3', chapterId: 'ch-math-2', title: 'Coordinate Geometry', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-m2-4', chapterId: 'ch-math-2', title: 'Surface Area & Volume', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
          ],
        },
        {
          id: 'ch-math-3',
          subjectId: 'sub-math',
          name: 'Calculus',
          tasks: [
            { id: 'task-m3-1', chapterId: 'ch-math-3', title: 'Limits', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-m3-2', chapterId: 'ch-math-3', title: 'Derivatives', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-m3-3', chapterId: 'ch-math-3', title: 'Integration', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-m3-4', chapterId: 'ch-math-3', title: 'Applications of Derivatives', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
          ],
        },
      ],
    },
    {
      id: 'sub-physics',
      name: 'Physics',
      chapters: [
        {
          id: 'ch-phys-1',
          subjectId: 'sub-physics',
          name: 'Mechanics',
          tasks: [
            { id: 'task-p1-1', chapterId: 'ch-phys-1', title: 'Newton\'s Laws', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-p1-2', chapterId: 'ch-phys-1', title: 'Work & Energy', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-p1-3', chapterId: 'ch-phys-1', title: 'Momentum', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-p1-4', chapterId: 'ch-phys-1', title: 'Gravitation', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
          ],
        },
        {
          id: 'ch-phys-2',
          subjectId: 'sub-physics',
          name: 'Thermodynamics',
          tasks: [
            { id: 'task-p2-1', chapterId: 'ch-phys-2', title: 'Heat Transfer', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-p2-2', chapterId: 'ch-phys-2', title: 'Laws of Thermodynamics', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-p2-3', chapterId: 'ch-phys-2', title: 'Entropy', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-p2-4', chapterId: 'ch-phys-2', title: 'Thermal Expansion', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
          ],
        },
        {
          id: 'ch-phys-3',
          subjectId: 'sub-physics',
          name: 'Optics',
          tasks: [
            { id: 'task-p3-1', chapterId: 'ch-phys-3', title: 'Reflection', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-p3-2', chapterId: 'ch-phys-3', title: 'Refraction', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-p3-3', chapterId: 'ch-phys-3', title: 'Lenses', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-p3-4', chapterId: 'ch-phys-3', title: 'Wave Optics', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
          ],
        },
      ],
    },
    {
      id: 'sub-chemistry',
      name: 'Chemistry',
      chapters: [
        {
          id: 'ch-chem-1',
          subjectId: 'sub-chemistry',
          name: 'Organic Chemistry',
          tasks: [
            { id: 'task-c1-1', chapterId: 'ch-chem-1', title: 'Hydrocarbons', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-c1-2', chapterId: 'ch-chem-1', title: 'Alcohols & Phenols', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-c1-3', chapterId: 'ch-chem-1', title: 'Aldehydes & Ketones', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-c1-4', chapterId: 'ch-chem-1', title: 'Carboxylic Acids', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
          ],
        },
        {
          id: 'ch-chem-2',
          subjectId: 'sub-chemistry',
          name: 'Inorganic Chemistry',
          tasks: [
            { id: 'task-c2-1', chapterId: 'ch-chem-2', title: 'Periodic Table', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-c2-2', chapterId: 'ch-chem-2', title: 'Chemical Bonding', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-c2-3', chapterId: 'ch-chem-2', title: 'Coordination Compounds', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-c2-4', chapterId: 'ch-chem-2', title: 'd-Block Elements', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
          ],
        },
        {
          id: 'ch-chem-3',
          subjectId: 'sub-chemistry',
          name: 'Physical Chemistry',
          tasks: [
            { id: 'task-c3-1', chapterId: 'ch-chem-3', title: 'Electrochemistry', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-c3-2', chapterId: 'ch-chem-3', title: 'Chemical Kinetics', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-c3-3', chapterId: 'ch-chem-3', title: 'Solutions', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
            { id: 'task-c3-4', chapterId: 'ch-chem-3', title: 'Equilibrium', status: 'not_started', updatedAt: new Date().toISOString(), version: 0, deleted: false },
          ],
        },
      ],
    },
  ];
}
