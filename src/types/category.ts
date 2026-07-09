export interface Category {
  id: string
  name: string
  sortOrder: number
  color?: string
}

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: '办公室费用', sortOrder: 0,  color: '#3b82f6' },
  { name: '买菜费用', sortOrder: 1,  color: '#10b981' },
  { name: '车辆费用', sortOrder: 2,  color: '#f59e0b' },
  { name: '日常费用', sortOrder: 3,  color: '#6366f1' },
  { name: '财务费用', sortOrder: 4,  color: '#ec4899' },
  { name: '电费', sortOrder: 5,  color: '#eab308' },
  { name: '外出办公误餐费', sortOrder: 6, color: '#f97316' },
  { name: '打车费用', sortOrder: 7,  color: '#14b8a6' },
  { name: '差旅费', sortOrder: 8,  color: '#8b5cf6' },
  { name: '快递费用', sortOrder: 9,  color: '#06b6d4' },
  { name: '网络费', sortOrder: 10, color: '#84cc16' },
  { name: '服务费用', sortOrder: 11, color: '#a855f7' },
  { name: '工资', sortOrder: 12, color: '#22c55e' },
  { name: '协调费', sortOrder: 13, color: '#f43f5e' },
  { name: '别墅工程费用', sortOrder: 14, color: '#0ea5e9' },
  { name: '别墅区管理费', sortOrder: 15, color: '#d946ef' },
  { name: '购物', sortOrder: 16, color: '#fb923c' },
  { name: '招待餐费', sortOrder: 17, color: '#e11d48' },
  { name: '机场费用', sortOrder: 18, color: '#7c3aed' },
  { name: '物业费用', sortOrder: 19, color: '#0891b2' },
  { name: '公证费', sortOrder: 20, color: '#65a30d' },
  { name: '园区星链', sortOrder: 21, color: '#dc2626' },
  { name: '中介费', sortOrder: 22, color: '#2563eb' },
]
