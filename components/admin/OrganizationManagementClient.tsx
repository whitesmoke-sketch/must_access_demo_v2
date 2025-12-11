'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  Users,
  GripVertical,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  softDeleteDepartment,
  reorderDepartments,
  getDepartmentMembers,
  type DepartmentWithStats,
} from '@/app/actions/department'

interface Department {
  id: string
  name: string
  code?: string
  parentId: string | null
  order: number
  memberCount?: number
}

interface DepartmentFormData {
  name: string
  code: string
  parentId: string | null
}

interface TreeNode extends Department {
  children: TreeNode[]
  level: number
  totalMemberCount: number // 하위 부서 포함 전체 인원수
}

const ItemType = 'DEPARTMENT'

interface DragItem {
  id: string
  index: number
  parentId: string | null
}

interface DepartmentTreeItemProps {
  node: TreeNode
  index: number
  onEdit: (dept: Department) => void
  onDelete: (dept: Department) => void
  onAddChild: (parentId: string) => void
  onSelect: (dept: Department) => void
  selectedId: string | null
  expandedIds: Set<string>
  toggleExpand: (id: string) => void
  moveDepartment: (
    dragId: string,
    hoverId: string,
    dragParentId: string | null,
    hoverParentId: string | null
  ) => void
  highlightedId: string | null
}

const DepartmentTreeItem: React.FC<DepartmentTreeItemProps> = ({
  node,
  index,
  onEdit,
  onDelete,
  onAddChild,
  onSelect,
  selectedId,
  expandedIds,
  toggleExpand,
  moveDepartment,
  highlightedId,
}) => {
  const isExpanded = expandedIds.has(node.id)
  const hasChildren = node.children.length > 0

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { id: node.id, index, parentId: node.parentId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [{ isOver }, drop] = useDrop({
    accept: ItemType,
    hover: (item: DragItem) => {
      if (item.id !== node.id) {
        // 같은 레벨에서만 이동 가능
        if (item.parentId === node.parentId) {
          moveDepartment(item.id, node.id, item.parentId, node.parentId)
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  })

  const combinedRef = (el: HTMLDivElement | null) => {
    drag(el)
    drop(el)
  }

  return (
    <div>
      <div
        ref={combinedRef}
        className={`
          flex items-center gap-2 p-3 rounded-lg transition-all duration-150 ease-in-out cursor-pointer
          ${selectedId === node.id ? 'bg-[rgba(99,91,255,0.1)] border-2 border-[#635BFF]' : 'border-2 border-transparent'}
          ${highlightedId === node.id ? 'bg-[rgba(248,198,83,0.2)] border-2 border-[#F8C653]' : ''}
          ${isOver && !isDragging ? 'bg-[rgba(22,205,199,0.1)]' : ''}
          ${isDragging ? 'opacity-50' : ''}
          hover:bg-[rgba(99,91,255,0.05)]
        `}
        style={{
          marginLeft: `${node.level * 24}px`,
        }}
        onClick={() => onSelect(node)}
      >
        {/* 드래그 핸들 */}
        <div className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
        </div>

        {/* 펼치기/접기 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) toggleExpand(node.id)
          }}
          className="flex items-center justify-center w-5 h-5"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            ) : (
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </button>

        {/* 부서 정보 */}
        <div className="flex-1 flex items-center gap-3">
          <Building2 className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 'var(--font-size-body)', fontWeight: 500, lineHeight: 1.5 }}>
                {node.name}
              </span>
              {node.code && (
                <Badge variant="outline" style={{ fontSize: 'var(--font-size-caption)' }}>
                  {node.code}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
              <Users className="w-4 h-4" />
              <span style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.4 }}>
                {node.totalMemberCount || 0}명
              </span>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onAddChild(node.id)
            }}
            style={{ fontSize: 'var(--font-size-caption)' }}
          >
            <Plus className="w-4 h-4" />
            하위 부서
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(node)
            }}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(node)
            }}
          >
            <Trash2 className="w-4 h-4" style={{ color: '#E53935' }} />
          </Button>
        </div>
      </div>

      {/* 하위 부서 */}
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {node.children.map((child, idx) => (
            <DepartmentTreeItem
              key={child.id}
              node={child}
              index={idx}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onSelect={onSelect}
              selectedId={selectedId}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              moveDepartment={moveDepartment}
              highlightedId={highlightedId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface DepartmentMember {
  id: string
  name: string
  email: string
  status: string
  employment_date: string
  role: {
    name: string
    code: string
    level: number
  }
}

export default function OrganizationManagementClient() {
  // State
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null)
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: '',
    code: '',
    parentId: null,
  })
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [departmentMembers, setDepartmentMembers] = useState<DepartmentMember[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)

  // Load departments from API
  useEffect(() => {
    async function loadDepartments() {
      try {
        setIsLoading(true)
        const result = await getDepartments()

        if (result.success && result.data) {
          // Convert database format to UI format
          const converted: Department[] = result.data.map((dept) => ({
            id: String(dept.id),
            name: dept.name,
            code: dept.code,
            parentId: dept.parent_department_id ? String(dept.parent_department_id) : null,
            order: dept.display_order,
            memberCount: dept.active_member_count,
          }))
          setDepartments(converted)
        } else {
          toast.error('부서 목록을 불러올 수 없습니다', {
            description: result.error || '알 수 없는 오류가 발생했습니다'
          })
        }
      } catch (error) {
        console.error('Load departments error:', error)
        toast.error('부서 목록 로드 실패')
      } finally {
        setIsLoading(false)
      }
    }

    loadDepartments()
  }, [])

  // Load department members when selected department changes
  useEffect(() => {
    async function loadMembers() {
      if (!selectedDepartment) {
        setDepartmentMembers([])
        return
      }

      try {
        setIsLoadingMembers(true)
        console.log('🔄 Client: Loading members for department:', selectedDepartment.id, selectedDepartment.name)
        const result = await getDepartmentMembers(Number(selectedDepartment.id))

        console.log('📥 Client: Received result:', {
          success: result.success,
          dataLength: result.data?.length || 0,
          error: result.error,
          data: result.data
        })

        if (result.success && result.data) {
          setDepartmentMembers(result.data as any)
          console.log('✅ Client: Set department members:', result.data.length, 'members')
        } else {
          console.error('❌ Load members error:', result.error)
          setDepartmentMembers([])
        }
      } catch (error) {
        console.error('❌ Load members exception:', error)
        setDepartmentMembers([])
      } finally {
        setIsLoadingMembers(false)
      }
    }

    loadMembers()
  }, [selectedDepartment])

  // 트리 구조 생성
  const buildTree = (depts: Department[]): TreeNode[] => {
    const map: Record<string, TreeNode> = {}
    const roots: TreeNode[] = []

    // 먼저 모든 노드 생성
    depts.forEach((dept) => {
      map[dept.id] = {
        ...dept,
        memberCount: dept.memberCount || 0,
        children: [],
        level: 0,
        totalMemberCount: 0, // 나중에 계산
      }
    })

    // 부모-자식 관계 연결
    depts.forEach((dept) => {
      const node = map[dept.id]
      if (dept.parentId && map[dept.parentId]) {
        map[dept.parentId].children.push(node)
        node.level = map[dept.parentId].level + 1
      } else {
        roots.push(node)
      }
    })

    // order로 정렬
    const sortByOrder = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => a.order - b.order)
      nodes.forEach((node) => {
        if (node.children.length > 0) {
          sortByOrder(node.children)
        }
      })
    }

    sortByOrder(roots)

    // 하위 부서 포함 전체 인원수 계산 (bottom-up)
    const calculateTotalMemberCount = (node: TreeNode): number => {
      let total = node.memberCount || 0
      node.children.forEach((child) => {
        total += calculateTotalMemberCount(child)
      })
      node.totalMemberCount = total
      return total
    }

    roots.forEach((root) => calculateTotalMemberCount(root))

    return roots
  }

  const departmentTree = useMemo(() => {
    return buildTree(departments)
  }, [departments])

  // 검색 기능
  const searchDepartments = (query: string) => {
    if (!query.trim()) {
      setHighlightedId(null)
      return
    }

    const q = query.toLowerCase()

    const findDepartment = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        if (node.name.toLowerCase().includes(q) || node.code?.toLowerCase().includes(q)) {
          return node
        }
        if (node.children.length > 0) {
          const found = findDepartment(node.children)
          if (found) return found
        }
      }
      return null
    }

    const found = findDepartment(departmentTree)

    if (found) {
      setHighlightedId(found.id)
      const expandParents = (deptId: string) => {
        const dept = departments.find((d) => d.id === deptId)
        if (dept?.parentId) {
          setExpandedIds((prev) => new Set(prev).add(dept.parentId!))
          expandParents(dept.parentId)
        }
      }
      expandParents(found.id)
      setExpandedIds((prev) => new Set(prev).add(found.id))

      toast.success('검색 완료', {
        description: `"${found.name}" 부서를 찾았습니다.`,
      })
    } else {
      setHighlightedId(null)
      toast.error('검색 실패', {
        description: '해당 부서를 찾을 수 없습니다.',
      })
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleCreateDepartment = async () => {
    if (!formData.name.trim()) {
      toast.error('부서명을 입력해주세요')
      return
    }
    if (!formData.code.trim()) {
      toast.error('부서 코드를 입력해주세요')
      return
    }

    try {
      const result = await createDepartment({
        name: formData.name,
        code: formData.code,
        parent_department_id: formData.parentId ? Number(formData.parentId) : null,
      })

      if (result.success) {
        toast.success('부서 생성 완료', {
          description: `"${formData.name}" 부서가 추가되었습니다.`,
        })

        // Reload departments
        const reloadResult = await getDepartments()
        if (reloadResult.success && reloadResult.data) {
          const converted: Department[] = reloadResult.data.map((dept) => ({
            id: String(dept.id),
            name: dept.name,
            code: dept.code,
            parentId: dept.parent_department_id ? String(dept.parent_department_id) : null,
            order: dept.display_order,
            memberCount: dept.active_member_count,
          }))
          setDepartments(converted)
        }

        setIsCreateDialogOpen(false)
        setFormData({ name: '', code: '', parentId: null })
      } else {
        toast.error('부서 생성 실패', {
          description: result.error || '알 수 없는 오류가 발생했습니다'
        })
      }
    } catch (error) {
      console.error('Create department error:', error)
      toast.error('부서 생성 중 오류가 발생했습니다')
    }
  }

  const handleEditDepartment = async () => {
    if (!editingDepartment || !formData.name.trim()) {
      toast.error('부서명을 입력해주세요')
      return
    }
    if (!formData.code.trim()) {
      toast.error('부서 코드를 입력해주세요')
      return
    }

    try {
      const result = await updateDepartment(Number(editingDepartment.id), {
        name: formData.name,
        code: formData.code,
      })

      if (result.success) {
        toast.success('부서 수정 완료', {
          description: `"${formData.name}" 부서 정보가 수정되었습니다.`,
        })

        // Reload departments
        const reloadResult = await getDepartments()
        if (reloadResult.success && reloadResult.data) {
          const converted: Department[] = reloadResult.data.map((dept) => ({
            id: String(dept.id),
            name: dept.name,
            code: dept.code,
            parentId: dept.parent_department_id ? String(dept.parent_department_id) : null,
            order: dept.display_order,
            memberCount: dept.active_member_count,
          }))
          setDepartments(converted)
        }

        setIsEditDialogOpen(false)
        setEditingDepartment(null)
        setFormData({ name: '', code: '', parentId: null })
      } else {
        toast.error('부서 수정 실패', {
          description: result.error || '알 수 없는 오류가 발생했습니다'
        })
      }
    } catch (error) {
      console.error('Update department error:', error)
      toast.error('부서 수정 중 오류가 발생했습니다')
    }
  }

  const handleDeleteDepartment = async () => {
    if (!deletingDepartment) return

    try {
      const result = await softDeleteDepartment(Number(deletingDepartment.id))

      if (result.success) {
        toast.success('부서 삭제 완료', {
          description: `"${deletingDepartment.name}" 부서가 삭제되었습니다.`,
        })

        // Reload departments
        const reloadResult = await getDepartments()
        if (reloadResult.success && reloadResult.data) {
          const converted: Department[] = reloadResult.data.map((dept) => ({
            id: String(dept.id),
            name: dept.name,
            code: dept.code,
            parentId: dept.parent_department_id ? String(dept.parent_department_id) : null,
            order: dept.display_order,
            memberCount: dept.active_member_count,
          }))
          setDepartments(converted)
        }

        setIsDeleteDialogOpen(false)
        setDeletingDepartment(null)
        setSelectedDepartment(null)
      } else {
        toast.error('부서 삭제 실패', {
          description: result.error || '알 수 없는 오류가 발생했습니다'
        })
      }
    } catch (error) {
      console.error('Delete department error:', error)
      toast.error('부서 삭제 중 오류가 발생했습니다')
    }
  }

  const moveDepartment = async (
    dragId: string,
    hoverId: string,
    dragParentId: string | null,
    hoverParentId: string | null
  ) => {
    if (dragParentId !== hoverParentId) return

    const siblings = departments.filter((d) => d.parentId === dragParentId)
    const dragIndex = siblings.findIndex((d) => d.id === dragId)
    const hoverIndex = siblings.findIndex((d) => d.id === hoverId)

    if (dragIndex === -1 || hoverIndex === -1) return

    // Optimistic UI update
    const newSiblings = [...siblings]
    const [dragItem] = newSiblings.splice(dragIndex, 1)
    newSiblings.splice(hoverIndex, 0, dragItem)

    const updatedSiblings = newSiblings.map((dept, index) => ({
      ...dept,
      order: index,
    }))

    const otherDepts = departments.filter((d) => d.parentId !== dragParentId)
    const optimisticState = [...otherDepts, ...updatedSiblings]
    setDepartments(optimisticState)

    // Call API to persist the reorder
    try {
      const reorderData = updatedSiblings.map((dept) => ({
        id: Number(dept.id),
        display_order: dept.order,
      }))

      const result = await reorderDepartments(reorderData)

      if (!result.success) {
        // Rollback on error
        setDepartments(departments)
        toast.error('순서 변경 실패', {
          description: result.error || '알 수 없는 오류가 발생했습니다'
        })
      }
    } catch (error) {
      console.error('Reorder departments error:', error)
      // Rollback on error
      setDepartments(departments)
      toast.error('순서 변경 중 오류가 발생했습니다')
    }
  }

  const openCreateDialog = (parentId: string | null = null) => {
    setFormData({ name: '', code: '', parentId })
    setIsCreateDialogOpen(true)
  }

  const openEditDialog = (dept: Department) => {
    setEditingDepartment(dept)
    setFormData({ name: dept.name, code: dept.code || '', parentId: dept.parentId })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (dept: Department) => {
    setDeletingDepartment(dept)
    setIsDeleteDialogOpen(true)
  }

  const getDepartmentPath = (deptId: string): string => {
    const path: string[] = []
    let currentId: string | null = deptId

    while (currentId) {
      const dept = departments.find((d) => d.id === currentId)
      if (!dept) break
      path.unshift(dept.name)
      currentId = dept.parentId
    }

    return path.join(' > ')
  }

  const getChildDepartments = (deptId: string): Department[] => {
    return departments.filter((d) => d.parentId === deptId)
  }

  // Show loading indicator
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
          <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--muted-foreground)' }}>
            부서 목록을 불러오는 중...
          </p>
        </div>
      </div>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* 헤더 */}
        <div>
          <h2
            style={{
              color: 'var(--card-foreground)',
              fontSize: 'var(--font-size-h1)',
              fontWeight: 'var(--font-weight-h1)',
              lineHeight: 1.25,
            }}
          >
            조직 관리
          </h2>
          <p
            style={{
              color: 'var(--muted-foreground)',
              fontSize: 'var(--font-size-body)',
              lineHeight: 1.5,
            }}
            className="mt-1"
          >
            부서 구조를 관리하고 조직도를 편집합니다
          </p>
        </div>

        {/* 검색 및 액션 바 */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
              style={{ color: 'var(--muted-foreground)' }}
            />
            <Input
              placeholder="부서명 또는 코드로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  searchDepartments(searchQuery)
                }
              }}
              className="pl-10"
              style={{ fontSize: 'var(--font-size-body)', lineHeight: 1.5 }}
            />
          </div>
          <Button
            onClick={() => searchDepartments(searchQuery)}
            variant="outline"
            style={{ fontSize: 'var(--font-size-body)' }}
          >
            <Search className="w-4 h-4 mr-2" />
            검색
          </Button>
          <Button
            onClick={() => openCreateDialog()}
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
              fontSize: 'var(--font-size-body)',
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            신규 부서 생성
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 조직 트리 */}
          <div className="lg:col-span-2">
            <Card
              style={{
                borderRadius: 'var(--radius)',
                boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2
                    style={{
                      fontSize: 'var(--font-size-h2)',
                      fontWeight: 'var(--font-weight-h2)',
                      lineHeight: 1.3,
                    }}
                  >
                    조직 구조
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (expandedIds.size === 0) {
                        setExpandedIds(new Set(departments.map((d) => d.id)))
                      } else {
                        setExpandedIds(new Set())
                      }
                    }}
                    style={{ fontSize: 'var(--font-size-caption)' }}
                  >
                    {expandedIds.size === 0 ? '전체 펼치기' : '전체 접기'}
                  </Button>
                </div>

                <div className="space-y-2">
                  {departmentTree.length === 0 ? (
                    <div className="text-center py-12">
                      <Building2
                        className="w-12 h-12 mx-auto mb-4"
                        style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}
                      />
                      <p
                        style={{
                          fontSize: 'var(--font-size-body)',
                          color: 'var(--muted-foreground)',
                          lineHeight: 1.5,
                        }}
                      >
                        등록된 부서가 없습니다
                      </p>
                      <Button
                        onClick={() => openCreateDialog()}
                        className="mt-4"
                        style={{
                          backgroundColor: 'var(--primary)',
                          color: 'var(--primary-foreground)',
                          fontSize: 'var(--font-size-body)',
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        첫 부서 추가하기
                      </Button>
                    </div>
                  ) : (
                    departmentTree.map((node, idx) => (
                      <DepartmentTreeItem
                        key={node.id}
                        node={node}
                        index={idx}
                        onEdit={openEditDialog}
                        onDelete={openDeleteDialog}
                        onAddChild={openCreateDialog}
                        onSelect={setSelectedDepartment}
                        selectedId={selectedDepartment?.id || null}
                        expandedIds={expandedIds}
                        toggleExpand={toggleExpand}
                        moveDepartment={moveDepartment}
                        highlightedId={highlightedId}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 부서 상세 패널 */}
          <div className="lg:col-span-1">
            <Card
              style={{
                borderRadius: 'var(--radius)',
                boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)',
              }}
            >
              <CardContent className="p-6">
                <h2
                  style={{
                    fontSize: 'var(--font-size-h2)',
                    fontWeight: 'var(--font-weight-h2)',
                    lineHeight: 1.3,
                    marginBottom: '16px',
                  }}
                >
                  부서 상세
                </h2>

                {selectedDepartment ? (
                  <div className="space-y-4">
                    {/* 부서 정보 */}
                    <div>
                      <Label
                        style={{
                          fontSize: 'var(--font-size-caption)',
                          color: 'var(--muted-foreground)',
                          lineHeight: 1.4,
                        }}
                      >
                        부서명
                      </Label>
                      <p
                        style={{
                          fontSize: 'var(--font-size-body)',
                          fontWeight: 500,
                          lineHeight: 1.5,
                          marginTop: '4px',
                        }}
                      >
                        {selectedDepartment.name}
                      </p>
                    </div>

                    {selectedDepartment.code && (
                      <div>
                        <Label
                          style={{
                            fontSize: 'var(--font-size-caption)',
                            color: 'var(--muted-foreground)',
                            lineHeight: 1.4,
                          }}
                        >
                          부서 코드
                        </Label>
                        <p
                          style={{
                            fontSize: 'var(--font-size-body)',
                            lineHeight: 1.5,
                            marginTop: '4px',
                          }}
                        >
                          {selectedDepartment.code}
                        </p>
                      </div>
                    )}

                    <div>
                      <Label
                        style={{
                          fontSize: 'var(--font-size-caption)',
                          color: 'var(--muted-foreground)',
                          lineHeight: 1.4,
                        }}
                      >
                        상위 부서
                      </Label>
                      <p
                        style={{
                          fontSize: 'var(--font-size-body)',
                          lineHeight: 1.5,
                          marginTop: '4px',
                        }}
                      >
                        {selectedDepartment.parentId
                          ? departments.find((d) => d.id === selectedDepartment.parentId)?.name ||
                            '-'
                          : '최상위 부서'}
                      </p>
                    </div>

                    <div>
                      <Label
                        style={{
                          fontSize: 'var(--font-size-caption)',
                          color: 'var(--muted-foreground)',
                          lineHeight: 1.4,
                        }}
                      >
                        조직 경로
                      </Label>
                      <p
                        style={{
                          fontSize: 'var(--font-size-caption)',
                          lineHeight: 1.4,
                          marginTop: '4px',
                          color: 'var(--muted-foreground)',
                        }}
                      >
                        {getDepartmentPath(selectedDepartment.id)}
                      </p>
                    </div>

                    {/* 소속 인원 */}
                    <div>
                      <Label
                        style={{
                          fontSize: 'var(--font-size-caption)',
                          color: 'var(--muted-foreground)',
                          lineHeight: 1.4,
                          marginBottom: '8px',
                          display: 'block',
                        }}
                      >
                        소속 인원 ({departmentMembers.length}명)
                      </Label>
                      {isLoadingMembers ? (
                        <p
                          style={{
                            fontSize: 'var(--font-size-caption)',
                            color: 'var(--muted-foreground)',
                            lineHeight: 1.4,
                            textAlign: 'center',
                            padding: '16px',
                          }}
                        >
                          로딩 중...
                        </p>
                      ) : departmentMembers.length === 0 ? (
                        <p
                          style={{
                            fontSize: 'var(--font-size-caption)',
                            color: 'var(--muted-foreground)',
                            lineHeight: 1.4,
                            textAlign: 'center',
                            padding: '16px',
                          }}
                        >
                          소속 인원이 없습니다
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {departmentMembers.map((member) => (
                            <div
                              key={member.id}
                              style={{
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--background)',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'start',
                                  marginBottom: '4px',
                                }}
                              >
                                <p
                                  style={{
                                    fontSize: 'var(--font-size-body)',
                                    fontWeight: 500,
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {member.name}
                                </p>
                                <span
                                  style={{
                                    fontSize: 'var(--font-size-caption)',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--muted)',
                                    color: 'var(--muted-foreground)',
                                  }}
                                >
                                  {member.role?.name || '-'}
                                </span>
                              </div>
                              <p
                                style={{
                                  fontSize: 'var(--font-size-caption)',
                                  color: 'var(--muted-foreground)',
                                  lineHeight: 1.4,
                                }}
                              >
                                {member.email}
                              </p>
                              <p
                                style={{
                                  fontSize: 'var(--font-size-caption)',
                                  color: 'var(--muted-foreground)',
                                  lineHeight: 1.4,
                                  marginTop: '2px',
                                }}
                              >
                                입사일: {new Date(member.employment_date).toLocaleDateString('ko-KR')}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 하위 조직 */}
                    <div>
                      <Label
                        style={{
                          fontSize: 'var(--font-size-caption)',
                          color: 'var(--muted-foreground)',
                          lineHeight: 1.4,
                          marginBottom: '8px',
                          display: 'block',
                        }}
                      >
                        하위 부서 ({getChildDepartments(selectedDepartment.id).length}개)
                      </Label>
                      {getChildDepartments(selectedDepartment.id).length === 0 ? (
                        <p
                          style={{
                            fontSize: 'var(--font-size-caption)',
                            color: 'var(--muted-foreground)',
                            lineHeight: 1.4,
                            textAlign: 'center',
                            padding: '16px',
                          }}
                        >
                          하위 부서가 없습니다
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {getChildDepartments(selectedDepartment.id).map((dept) => (
                            <div
                              key={dept.id}
                              className="p-2 rounded-lg cursor-pointer hover:bg-[rgba(99,91,255,0.05)] transition-all duration-150 ease-in-out"
                              onClick={() => setSelectedDepartment(dept)}
                            >
                              <p style={{ fontSize: 'var(--font-size-body)', lineHeight: 1.5 }}>
                                {dept.name}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Building2
                      className="w-12 h-12 mx-auto mb-4"
                      style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}
                    />
                    <p
                      style={{
                        fontSize: 'var(--font-size-body)',
                        color: 'var(--muted-foreground)',
                        lineHeight: 1.5,
                      }}
                    >
                      부서를 선택하세요
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 부서 생성 다이얼로그 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle
              style={{
                fontSize: 'var(--font-size-h2)',
                fontWeight: 'var(--font-weight-h2)',
                lineHeight: 1.3,
              }}
            >
              신규 부서 생성
            </DialogTitle>
            <DialogDescription style={{ fontSize: 'var(--font-size-body)', lineHeight: 1.5 }}>
              새로운 부서를 추가합니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label style={{ fontSize: 'var(--font-size-body)', fontWeight: 500, lineHeight: 1.5 }}>
                부서명 *
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="부서명 입력"
                style={{ fontSize: 'var(--font-size-body)', lineHeight: 1.5 }}
              />
            </div>

            <div className="space-y-2">
              <Label style={{ fontSize: 'var(--font-size-body)', fontWeight: 500, lineHeight: 1.5 }}>
                부서 코드 *
              </Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="부서 코드 입력"
                style={{ fontSize: 'var(--font-size-body)', lineHeight: 1.5 }}
              />
            </div>

            <div className="space-y-2">
              <Label style={{ fontSize: 'var(--font-size-body)', fontWeight: 500, lineHeight: 1.5 }}>
                상위 부서
              </Label>
              <p
                style={{
                  fontSize: 'var(--font-size-body)',
                  lineHeight: 1.5,
                  padding: '8px',
                  backgroundColor: 'rgba(99,91,255,0.05)',
                  borderRadius: '8px',
                }}
              >
                {formData.parentId
                  ? departments.find((d) => d.id === formData.parentId)?.name
                  : '최상위 부서로 생성됩니다'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                setFormData({ name: '', code: '', parentId: null })
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleCreateDepartment}
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 부서 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle
              style={{
                fontSize: 'var(--font-size-h2)',
                fontWeight: 'var(--font-weight-h2)',
                lineHeight: 1.3,
              }}
            >
              부서 수정
            </DialogTitle>
            <DialogDescription style={{ fontSize: 'var(--font-size-body)', lineHeight: 1.5 }}>
              부서 정보를 수정합니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label style={{ fontSize: 'var(--font-size-body)', fontWeight: 500, lineHeight: 1.5 }}>
                부서명 *
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="부서명 입력"
                style={{ fontSize: 'var(--font-size-body)', lineHeight: 1.5 }}
              />
            </div>

            <div className="space-y-2">
              <Label style={{ fontSize: 'var(--font-size-body)', fontWeight: 500, lineHeight: 1.5 }}>
                부서 코드 *
              </Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="부서 코드 입력"
                style={{ fontSize: 'var(--font-size-body)', lineHeight: 1.5 }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                setEditingDepartment(null)
                setFormData({ name: '', code: '', parentId: null })
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleEditDepartment}
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 부서 삭제 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle
              style={{
                fontSize: 'var(--font-size-h2)',
                fontWeight: 'var(--font-weight-h2)',
                lineHeight: 1.3,
              }}
            >
              부서 삭제
            </DialogTitle>
            <DialogDescription style={{ fontSize: 'var(--font-size-body)', lineHeight: 1.5 }}>
              정말로 이 부서를 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>

          {deletingDepartment && (
            <div className="py-4">
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(229,57,53,0.1)' }}>
                <p
                  style={{
                    fontSize: 'var(--font-size-body)',
                    fontWeight: 500,
                    lineHeight: 1.5,
                    marginBottom: '8px',
                  }}
                >
                  {deletingDepartment.name}
                </p>
                <p
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    color: 'var(--muted-foreground)',
                    lineHeight: 1.4,
                  }}
                >
                  삭제된 부서는 복구할 수 없습니다.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeletingDepartment(null)
              }}
            >
              취소
            </Button>
            <Button onClick={handleDeleteDepartment} style={{ backgroundColor: '#E53935', color: 'white' }}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndProvider>
  )
}
