// Figma 디자인과 동일한 좌석 더미 데이터

export interface Seat {
  id: string
  name: string
  location: string
  status: 'available' | 'in_use' | 'maintenance'
  currentUserId?: string
  startTime?: string
}

export interface Locker {
  id: string
  name: string
  location: string
  status: 'available' | 'in_use' | 'maintenance'
  currentUserId?: string
  startTime?: string
}

export const demoSeats: Seat[] = [
  { id: 'seat-1', name: 'A-101', location: '1층 A구역', status: 'available' },
  { id: 'seat-2', name: 'A-102', location: '1층 A구역', status: 'available' },
  { id: 'seat-3', name: 'A-103', location: '1층 A구역', status: 'available' },
  { id: 'seat-4', name: 'A-104', location: '1층 A구역', status: 'available' },
  { id: 'seat-5', name: 'A-105', location: '1층 A구역', status: 'available' },
  { id: 'seat-6', name: 'A-106', location: '1층 A구역', status: 'available' },
  { id: 'seat-7', name: 'B-101', location: '1층 B구역', status: 'available' },
  { id: 'seat-8', name: 'B-102', location: '1층 B구역', status: 'available' },
  { id: 'seat-9', name: 'B-103', location: '1층 B구역', status: 'available' },
  { id: 'seat-10', name: 'B-104', location: '1층 B구역', status: 'available' },
  { id: 'seat-11', name: 'A-201', location: '2층 A구역', status: 'available' },
  { id: 'seat-12', name: 'A-202', location: '2층 A구역', status: 'available' },
  { id: 'seat-13', name: 'A-203', location: '2층 A구역', status: 'available' },
  { id: 'seat-14', name: 'A-204', location: '2층 A구역', status: 'available' },
  { id: 'seat-15', name: 'A-205', location: '2층 A구역', status: 'available' },
  { id: 'seat-16', name: 'A-206', location: '2층 A구역', status: 'available' },
  { id: 'seat-17', name: 'B-201', location: '2층 B구역', status: 'available' },
  { id: 'seat-18', name: 'B-202', location: '2층 B구역', status: 'available' },
  { id: 'seat-19', name: 'B-203', location: '2층 B구역', status: 'in_use', currentUserId: 'member-1', startTime: '09:15' },
  { id: 'seat-20', name: 'B-204', location: '2층 B구역', status: 'available' },
  { id: 'seat-21', name: 'A-301', location: '3층 A구역', status: 'available' },
  { id: 'seat-22', name: 'A-302', location: '3층 A구역', status: 'available' },
  { id: 'seat-23', name: 'A-303', location: '3층 A구역', status: 'maintenance' },
  { id: 'seat-24', name: 'A-304', location: '3층 A구역', status: 'available' },
]

export const demoLockers: Locker[] = [
  { id: 'locker-1', name: 'A-101', location: '1층 A구역', status: 'available' },
  { id: 'locker-2', name: 'A-102', location: '1층 A구역', status: 'available' },
  { id: 'locker-3', name: 'A-103', location: '1층 A구역', status: 'available' },
  { id: 'locker-4', name: 'A-104', location: '1층 A구역', status: 'available' },
  { id: 'locker-5', name: 'A-105', location: '1층 A구역', status: 'available' },
  { id: 'locker-6', name: 'A-106', location: '1층 A구역', status: 'available' },
  { id: 'locker-7', name: 'B-101', location: '1층 B구역', status: 'available' },
  { id: 'locker-8', name: 'B-102', location: '1층 B구역', status: 'available' },
  { id: 'locker-9', name: 'B-103', location: '1층 B구역', status: 'available' },
  { id: 'locker-10', name: 'B-104', location: '1층 B구역', status: 'available' },
  { id: 'locker-11', name: 'A-201', location: '2층 A구역', status: 'available' },
  { id: 'locker-12', name: 'A-202', location: '2층 A구역', status: 'available' },
  { id: 'locker-13', name: 'A-203', location: '2층 A구역', status: 'available' },
  { id: 'locker-14', name: 'A-204', location: '2층 A구역', status: 'available' },
  { id: 'locker-15', name: 'A-205', location: '2층 A구역', status: 'available' },
  { id: 'locker-16', name: 'A-206', location: '2층 A구역', status: 'available' },
  { id: 'locker-17', name: 'B-201', location: '2층 B구역', status: 'available' },
  { id: 'locker-18', name: 'B-202', location: '2층 B구역', status: 'available' },
  { id: 'locker-19', name: 'B-203', location: '2층 B구역', status: 'in_use', currentUserId: 'member-1', startTime: '09:15' },
  { id: 'locker-20', name: 'B-204', location: '2층 B구역', status: 'available' },
  { id: 'locker-21', name: 'A-301', location: '3층 A구역', status: 'available' },
  { id: 'locker-22', name: 'A-302', location: '3층 A구역', status: 'available' },
  { id: 'locker-23', name: 'A-303', location: '3층 A구역', status: 'maintenance' },
  { id: 'locker-24', name: 'A-304', location: '3층 A구역', status: 'available' },
]
