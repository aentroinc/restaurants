"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import type { OntologyObjectType, OntologyObject, OntologyRelationType } from "@/lib/types"
import { ChevronDown, ChevronRight, Search, X } from "lucide-react"

export default function OntologyPage() {
  const [objectTypes, setObjectTypes] = useState<OntologyObjectType[]>([])
  const [objects, setObjects] = useState<OntologyObject[]>([])
  const [relationTypes, setRelationTypes] = useState<OntologyRelationType[]>([])
  const [expandedType, setExpandedType] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [selectedObject, setSelectedObject] = useState<OntologyObject | null>(null)

  useEffect(() => {
    fetchAPI<OntologyObjectType[]>("/api/v1/ontology/object-types").then(setObjectTypes)
    fetchAPI<OntologyObject[]>("/api/v1/ontology/objects").then(setObjects)
    fetchAPI<OntologyRelationType[]>("/api/v1/ontology/relation-types").then(setRelationTypes)
  }, [])

  const filteredObjects = objects.filter((o) => {
    if (typeFilter !== "all" && o.object_type !== typeFilter) return false
    if (search && !o.display_name.toLowerCase().includes(search.toLowerCase()) && !o.canonical_id.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const typeBadgeColor: Record<string, string> = {
    store: "bg-blue-100 text-blue-800",
    brand: "bg-purple-100 text-purple-800",
    area: "bg-green-100 text-green-800",
    employee: "bg-orange-100 text-orange-800",
    supplier: "bg-red-100 text-red-800",
    menu_item: "bg-amber-100 text-amber-800",
  }

  const cardinalityLabels: Record<string, string> = {
    one_to_one: "1:1",
    one_to_many: "1:N",
    many_to_one: "N:1",
    many_to_many: "N:N",
  }

  return (
    <div>
      <ContextHeader title="オントロジー管理" description="オブジェクト型・オブジェクト・リレーションの管理" />

      <Tabs defaultValue="object-types">
        <TabsList>
          <TabsTrigger value="object-types">オブジェクト型</TabsTrigger>
          <TabsTrigger value="objects">オブジェクト</TabsTrigger>
          <TabsTrigger value="relations">リレーション</TabsTrigger>
        </TabsList>

        {/* Object Types Tab */}
        <TabsContent value="object-types" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>オブジェクト型</TableHead>
                  <TableHead>表示名</TableHead>
                  <TableHead>基本フィールド数</TableHead>
                  <TableHead>カスタムフィールド数</TableHead>
                  <TableHead>説明</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {objectTypes.map((ot) => (
                  <>
                    <TableRow
                      key={ot.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedType(expandedType === ot.id ? null : ot.id)}
                    >
                      <TableCell>
                        {expandedType === ot.id ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{ot.icon} {ot.object_type}</span>
                      </TableCell>
                      <TableCell className="font-medium">{ot.display_name}</TableCell>
                      <TableCell>{Object.keys(ot.base_schema).length}</TableCell>
                      <TableCell>{Object.keys(ot.custom_schema).length}</TableCell>
                      <TableCell className="text-sm text-gray-500 max-w-xs truncate">{ot.description}</TableCell>
                    </TableRow>
                    {expandedType === ot.id && (
                      <TableRow key={`${ot.id}-detail`}>
                        <TableCell colSpan={6} className="bg-slate-50 p-0">
                          <div className="px-8 py-4">
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">基本スキーマ</h4>
                                <div className="space-y-1">
                                  {Object.entries(ot.base_schema).map(([k, v]) => (
                                    <div key={k} className="flex items-center gap-2 text-sm">
                                      <span className="font-mono text-gray-700">{k}</span>
                                      <span className="text-gray-400">:</span>
                                      <Badge variant="outline" className="text-xs">{v}</Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">カスタムスキーマ</h4>
                                <div className="space-y-1">
                                  {Object.entries(ot.custom_schema).map(([k, v]) => (
                                    <div key={k} className="flex items-center gap-2 text-sm">
                                      <span className="font-mono text-gray-700">{k}</span>
                                      <span className="text-gray-400">:</span>
                                      <Badge variant="outline" className="text-xs">{v}</Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Objects Tab */}
        <TabsContent value="objects" className="mt-4">
          <div className="mb-4 flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="オブジェクトを検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="オブジェクト型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての型</SelectItem>
                {objectTypes.map((ot) => (
                  <SelectItem key={ot.id} value={ot.object_type}>{ot.icon} {ot.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredObjects.map((obj) => (
              <Card
                key={obj.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedObject(obj)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{obj.display_name}</div>
                      <div className="mt-0.5 text-xs text-gray-500 font-mono">{obj.canonical_id}</div>
                    </div>
                    <Badge className={`text-xs ${typeBadgeColor[obj.object_type] || "bg-gray-100 text-gray-800"}`}>
                      {objectTypes.find((ot) => ot.object_type === obj.object_type)?.display_name || obj.object_type}
                    </Badge>
                  </div>
                  <div className="mt-3 flex gap-4 text-xs text-gray-500">
                    <span>属性: {Object.keys(obj.attributes).length}</span>
                    <span>リレーション: {obj.relations?.length || 0}</span>
                  </div>
                  <div className="mt-2">
                    <Badge variant={obj.status === "active" ? "success" : "secondary"} className="text-xs">
                      {obj.status === "active" ? "有効" : obj.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Relation Types Tab */}
        <TabsContent value="relations" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>リレーション型</TableHead>
                  <TableHead>表示名</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead></TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>カーディナリティ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relationTypes.map((rt) => (
                  <TableRow key={rt.id}>
                    <TableCell className="font-mono text-sm">{rt.relation_type}</TableCell>
                    <TableCell className="font-medium">{rt.display_name}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${typeBadgeColor[rt.from_object_type] || "bg-gray-100"}`}>
                        {objectTypes.find((ot) => ot.object_type === rt.from_object_type)?.display_name || rt.from_object_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-400 text-center">→</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${typeBadgeColor[rt.to_object_type] || "bg-gray-100"}`}>
                        {objectTypes.find((ot) => ot.object_type === rt.to_object_type)?.display_name || rt.to_object_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-mono">{cardinalityLabels[rt.cardinality] || rt.cardinality}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Object Detail Sheet */}
      <Sheet open={!!selectedObject} onOpenChange={(open) => !open && setSelectedObject(null)}>
        <SheetContent className="w-[480px] sm:max-w-lg overflow-y-auto">
          {selectedObject && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedObject.display_name}</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`text-xs ${typeBadgeColor[selectedObject.object_type] || "bg-gray-100"}`}>
                    {objectTypes.find((ot) => ot.object_type === selectedObject.object_type)?.display_name || selectedObject.object_type}
                  </Badge>
                  <Badge variant={selectedObject.status === "active" ? "success" : "secondary"} className="text-xs">
                    {selectedObject.status === "active" ? "有効" : selectedObject.status}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">基本情報</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">ID</span>
                      <span className="font-mono text-gray-700">{selectedObject.id}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Canonical ID</span>
                      <span className="font-mono text-gray-700">{selectedObject.canonical_id}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">属性</h4>
                  <div className="space-y-2 rounded-lg bg-slate-50 p-3">
                    {Object.entries(selectedObject.attributes).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="font-mono text-gray-600">{k}</span>
                        <span className="text-gray-800">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedObject.relations && selectedObject.relations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">リレーション ({selectedObject.relations.length})</h4>
                    <div className="space-y-2">
                      {selectedObject.relations.map((rel) => (
                        <div key={rel.id} className="rounded border p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{rel.related_object.display_name}</span>
                            <Badge className={`text-xs ${typeBadgeColor[rel.related_object.object_type] || "bg-gray-100"}`}>
                              {rel.related_object.object_type}
                            </Badge>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {rel.direction === "outgoing" ? "→" : "←"} {rel.relation_type}
                          </div>
                          {Object.keys(rel.attributes).length > 0 && (
                            <div className="mt-2 space-y-1">
                              {Object.entries(rel.attributes).map(([k, v]) => (
                                <div key={k} className="text-xs text-gray-600">
                                  {k}: <span className="text-gray-800">{String(v)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
