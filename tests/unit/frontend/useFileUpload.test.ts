import { describe, it, expect, jest } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'
import { useFileUpload } from '@/hooks/useFileUpload'

// Mock the validatePDFFile function
jest.mock('@/lib/api', () => ({
  validatePDFFile: jest.fn((file: File) => {
    // Mock validation - accept PDF files under 10MB
    const isValid = file.type === 'application/pdf' && file.size <= 10 * 1024 * 1024
    return {
      valid: isValid,
      error: isValid ? undefined : 'Invalid file',
    }
  }),
}))

describe('useFileUpload', () => {
  const createMockFile = (name: string, size: number, type: string = 'application/pdf'): File => {
    return new File([''], name, { type }) as File
  }

  it('should initialize with empty files', () => {
    const { result } = renderHook(() => useFileUpload({ maxFiles: 10 }))

    expect(result.current.uploadedFiles).toEqual([])
    expect(result.current.validFiles).toEqual([])
    expect(result.current.hasValidFiles).toBe(false)
  })

  it('should add files correctly', () => {
    const { result } = renderHook(() => useFileUpload({ maxFiles: 10 }))
    const file1 = createMockFile('test1.pdf', 1024 * 1024)
    const file2 = createMockFile('test2.pdf', 2 * 1024 * 1024)

    act(() => {
      result.current.addFiles([file1, file2])
    })

    expect(result.current.uploadedFiles).toHaveLength(2)
    expect(result.current.uploadedFiles[0].file.name).toBe('test1.pdf')
    expect(result.current.uploadedFiles[1].file.name).toBe('test2.pdf')
  })

  it('should validate files correctly', () => {
    const { result } = renderHook(() => useFileUpload({ maxFiles: 10 }))
    const validFile = createMockFile('valid.pdf', 1024 * 1024)

    act(() => {
      result.current.addFiles([validFile])
    })

    expect(result.current.validFiles).toHaveLength(1)
    expect(result.current.hasValidFiles).toBe(true)
    expect(result.current.uploadedFiles[0].valid).toBe(true)
  })

  it('should respect maxFiles limit', () => {
    const { result } = renderHook(() => useFileUpload({ maxFiles: 2 }))
    const files = [
      createMockFile('file1.pdf', 1024),
      createMockFile('file2.pdf', 1024),
      createMockFile('file3.pdf', 1024),
    ]

    act(() => {
      result.current.addFiles(files)
    })

    expect(result.current.uploadedFiles).toHaveLength(2)
  })

  it('should replace files correctly', () => {
    const { result } = renderHook(() => useFileUpload({ maxFiles: 10 }))
    const file1 = createMockFile('file1.pdf', 1024)
    const file2 = createMockFile('file2.pdf', 1024)
    const file3 = createMockFile('file3.pdf', 1024)

    act(() => {
      result.current.addFiles([file1, file2])
    })

    expect(result.current.uploadedFiles).toHaveLength(2)

    act(() => {
      result.current.replaceFiles([file3])
    })

    expect(result.current.uploadedFiles).toHaveLength(1)
    expect(result.current.uploadedFiles[0].file.name).toBe('file3.pdf')
  })

  it('should remove file by id', () => {
    const { result } = renderHook(() => useFileUpload({ maxFiles: 10 }))
    const file1 = createMockFile('file1.pdf', 1024)
    const file2 = createMockFile('file2.pdf', 1024)

    act(() => {
      result.current.addFiles([file1, file2])
    })

    const fileId = result.current.uploadedFiles[0].id

    act(() => {
      result.current.removeFile(fileId)
    })

    expect(result.current.uploadedFiles).toHaveLength(1)
    expect(result.current.uploadedFiles[0].file.name).toBe('file2.pdf')
  })

  it('should clear all files', () => {
    const { result } = renderHook(() => useFileUpload({ maxFiles: 10 }))
    const files = [createMockFile('file1.pdf', 1024), createMockFile('file2.pdf', 1024)]

    act(() => {
      result.current.addFiles(files)
    })

    expect(result.current.uploadedFiles).toHaveLength(2)

    act(() => {
      result.current.clearFiles()
    })

    expect(result.current.uploadedFiles).toEqual([])
    expect(result.current.hasValidFiles).toBe(false)
  })

  it('should call onFilesChange callback when files are added', () => {
    const onFilesChange = jest.fn()
    const { result } = renderHook(() => useFileUpload({ maxFiles: 10, onFilesChange }))
    const file = createMockFile('test.pdf', 1024)

    act(() => {
      result.current.addFiles([file])
    })

    expect(onFilesChange).toHaveBeenCalledTimes(1)
    expect(onFilesChange).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        file: expect.any(File),
        id: expect.any(String),
        valid: expect.any(Boolean),
      })
    ]))
  })

  it('should call onFilesChange callback when files are removed', () => {
    const onFilesChange = jest.fn()
    const { result } = renderHook(() => useFileUpload({ maxFiles: 10, onFilesChange }))
    const file = createMockFile('test.pdf', 1024)

    act(() => {
      result.current.addFiles([file])
    })

    onFilesChange.mockClear()

    const fileId = result.current.uploadedFiles[0].id

    act(() => {
      result.current.removeFile(fileId)
    })

    expect(onFilesChange).toHaveBeenCalledTimes(1)
    expect(onFilesChange).toHaveBeenCalledWith([])
  })

  it('should generate unique IDs for each file', () => {
    const { result } = renderHook(() => useFileUpload({ maxFiles: 10 }))
    const files = [
      createMockFile('file1.pdf', 1024),
      createMockFile('file2.pdf', 1024),
      createMockFile('file3.pdf', 1024),
    ]

    act(() => {
      result.current.addFiles(files)
    })

    const ids = result.current.uploadedFiles.map(f => f.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(3)
  })
})
