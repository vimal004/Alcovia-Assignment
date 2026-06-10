import fs from 'fs';
import path from 'path';
import type { Task, FocusSession, StudentState, Subject, Chapter } from '../../../packages/shared/types';

export interface WebhookLog {
  id: string;
  timestamp: string;
  url: string;
  payload: any;
  status: 'success' | 'ignored';
  reason?: string;
}

export interface DatabaseState {
  tasks: Record<string, Task>;
  sessions: FocusSession[];
  studentState: StudentState;
  processedActionIds: Record<string, boolean>;
  n8nWebhookUrl: string;
  n8nLogs: WebhookLog[];
  lastServerMutationAt?: string;
}

const DB_FILE = path.join(__dirname, '../db.json');
const TEMP_FILE = path.join(__dirname, '../db.tmp.json');

const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

const defaultStudentState = (): StudentState => ({
  studentId: 'student-001',
  coins: 0,
  streak: 0,
  lastStreakDate: null,
  todayFocusMinutes: 0,
  todayDate: getTodayDate(),
});

// Exact replica of initial syllabus structure
const generateInitialTasks = (): Record<string, Task> => {
  const seedTasks: Record<string, Task> = {};
  const subjects = [
    {
      id: 'sub-math',
      name: 'Mathematics',
      chapters: [
        {
          id: 'ch-math-1',
          name: 'Algebra',
          taskTitles: ['Linear Equations', 'Quadratic Equations', 'Polynomials', 'Factorization']
        },
        {
          id: 'ch-math-2',
          name: 'Geometry',
          taskTitles: ['Triangles', 'Circles', 'Coordinate Geometry', 'Surface Area & Volume']
        },
        {
          id: 'ch-math-3',
          name: 'Calculus',
          taskTitles: ['Limits', 'Derivatives', 'Integration', 'Applications of Derivatives']
        }
      ]
    },
    {
      id: 'sub-physics',
      name: 'Physics',
      chapters: [
        {
          id: 'ch-phys-1',
          name: 'Mechanics',
          taskTitles: ["Newton's Laws", 'Work & Energy', 'Momentum', 'Gravitation']
        },
        {
          id: 'ch-phys-2',
          name: 'Thermodynamics',
          taskTitles: ['Heat Transfer', 'Laws of Thermodynamics', 'Entropy', 'Thermal Expansion']
        },
        {
          id: 'ch-phys-3',
          name: 'Optics',
          taskTitles: ['Reflection', 'Refraction', 'Lenses', 'Wave Optics']
        }
      ]
    },
    {
      id: 'sub-chemistry',
      name: 'Chemistry',
      chapters: [
        {
          id: 'ch-chem-1',
          name: 'Organic Chemistry',
          taskTitles: ['Hydrocarbons', 'Alcohols & Phenols', 'Aldehydes & Ketones', 'Carboxylic Acids']
        },
        {
          id: 'ch-chem-2',
          name: 'Inorganic Chemistry',
          taskTitles: ['Periodic Table', 'Chemical Bonding', 'Coordination Compounds', 'd-Block Elements']
        },
        {
          id: 'ch-chem-3',
          name: 'Physical Chemistry',
          taskTitles: ['Electrochemistry', 'Chemical Kinetics', 'Solutions', 'Equilibrium']
        }
      ]
    }
  ];

  subjects.forEach((sub) => {
    sub.chapters.forEach((ch) => {
      ch.taskTitles.forEach((title, idx) => {
        const id = `task-${sub.id === 'sub-math' ? 'm' : sub.id === 'sub-physics' ? 'p' : 'c'}${ch.id.slice(-1)}-${idx + 1}`;
        seedTasks[id] = {
          id,
          chapterId: ch.id,
          title,
          status: 'not_started',
          updatedAt: new Date().toISOString(),
          version: 0,
          deleted: false,
        };
      });
    });
  });

  return seedTasks;
};

// Queue for sequential database operations to prevent race conditions (locking)
let dbPromiseChain: Promise<any> = Promise.resolve();

export class Database {
  private static getInitialState(): DatabaseState {
    return {
      tasks: generateInitialTasks(),
      sessions: [],
      studentState: defaultStudentState(),
      processedActionIds: {},
      n8nWebhookUrl: '',
      n8nLogs: [],
      lastServerMutationAt: new Date().toISOString(),
    };
  }

  // Atomic file write wrapper
  private static writeStateAtomically(state: DatabaseState): void {
    const data = JSON.stringify(state, null, 2);
    // Write to temporary file first
    fs.writeFileSync(TEMP_FILE, data, 'utf8');
    // Atomic rename to replace original safely
    fs.renameSync(TEMP_FILE, DB_FILE);
  }

  public static async read(): Promise<DatabaseState> {
    return new Promise((resolve, reject) => {
      dbPromiseChain = dbPromiseChain.then(() => {
        try {
          if (!fs.existsSync(DB_FILE)) {
            const initialState = this.getInitialState();
            this.writeStateAtomically(initialState);
            resolve(initialState);
          } else {
            const raw = fs.readFileSync(DB_FILE, 'utf8');
            resolve(JSON.parse(raw) as DatabaseState);
          }
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  public static async write(state: DatabaseState): Promise<void> {
    return new Promise((resolve, reject) => {
      dbPromiseChain = dbPromiseChain.then(() => {
        try {
          state.lastServerMutationAt = new Date().toISOString();
          this.writeStateAtomically(state);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }


  public static async reset(): Promise<DatabaseState> {
    return new Promise((resolve, reject) => {
      dbPromiseChain = dbPromiseChain.then(() => {
        try {
          const initialState = this.getInitialState();
          this.writeStateAtomically(initialState);
          resolve(initialState);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
}
