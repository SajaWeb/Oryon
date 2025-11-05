import { useState, useEffect, useMemo } from 'react'
import { Repair } from '../types'

export function usePagination(
  filteredRepairs: Repair[], 
  itemsPerPage: number = 15
) {
  const [currentPage, setCurrentPage] = useState(1)

  // Reset to page 1 when filtered items change
  useEffect(() => {
    setCurrentPage(1)
  }, [filteredRepairs.length])

  const totalPages = Math.ceil(filteredRepairs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = useMemo(
    () => filteredRepairs.slice(startIndex, endIndex),
    [filteredRepairs, startIndex, endIndex]
  )

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)))
  }

  const nextPage = () => {
    setCurrentPage(p => Math.min(totalPages, p + 1))
  }

  const previousPage = () => {
    setCurrentPage(p => Math.max(1, p - 1))
  }

  return {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    previousPage,
    setCurrentPage
  }
}
