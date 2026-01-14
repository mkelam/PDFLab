import axios from 'axios'
import type { Request, Response } from 'express'
import fs from 'fs'
import logger from '../config/logger'
import { pdfCoService } from '../services/pdfco.service'

export const addTextToPDF = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    const { text, x, y, pages } = req.body

    if (!text || x === undefined || y === undefined) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path)
      return res
        .status(400)
        .json({ success: false, error: 'Missing required parameters: text, x, y' })
    }

    const result = await pdfCoService.addText(req.file.path, {
      text,
      x: parseInt(x),
      y: parseInt(y),
      pages: pages || '0-'
    })

    // Clean up uploaded input file
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }
    } catch (e) {
      logger.error('Failed to cleanup temp file', e)
    }

    if (result.error) {
      return res.status(500).json({ success: false, error: result.message })
    }

    return res.status(200).json({
      success: true,
      url: result.url,
      message: result.message
    })
  } catch (error: any) {
    logger.error('Controller error in addTextToPDF:', error)
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' })
  }
}

export const analyzePdf = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    const result = await pdfCoService.convertPdfToJson(req.file.path)

    // Clean up
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }
    } catch (e) {
      logger.error('Failed to cleanup temp file', e)
    }

    if (result.error) {
      return res.status(500).json({ success: false, error: result.message })
    }

    // Optional: We could fetch the JSON here and return the object directly,
    // but returning the URL is also fine if the frontend fetches it.
    // Let's fetch it to save the frontend a CORS headache or extra step.
    try {
      const jsonResponse = await axios.get(result.jsonUrl)
      return res.status(200).json({
        success: true,
        data: jsonResponse.data
      })
    } catch (fetchErr) {
      logger.error('Failed to fetch JSON result from PDF.co', fetchErr)
      return res.status(200).json({
        success: true,
        jsonUrl: result.jsonUrl, // Fallback
        message: 'Converted, but failed to inline JSON. Use jsonUrl.'
      })
    }
  } catch (error: any) {
    logger.error('Controller error in analyzePdf:', error)
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' })
  }
}

export const replacePdfText = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    const { searchString, replacementString, pages } = req.body

    if (!searchString || replacementString === undefined) {
      fs.unlinkSync(req.file.path)
      return res
        .status(400)
        .json({ success: false, error: 'Missing searchString or replacementString' })
    }

    const result = await pdfCoService.replaceText(
      req.file.path,
      searchString,
      replacementString,
      pages
    )

    // Clean up
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }
    } catch (e) {
      logger.error('Failed to cleanup temp file', e)
    }

    if (result.error) {
      return res.status(500).json({ success: false, error: result.message })
    }

    return res.status(200).json({
      success: true,
      url: result.url,
      message: result.message
    })
  } catch (error: any) {
    logger.error('Controller error in replacePdfText:', error)
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' })
  }
}
