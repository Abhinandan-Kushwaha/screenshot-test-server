import * as url from 'url'
import * as fs from 'fs'
import { base64_encode, compareImages, generateHtml, msg } from './utils'
import puppeteer from 'puppeteer'
var http = require('http')

const isHeadLess = process.argv[2] || true
const uiUrl = process.argv[3] || 'http://localhost:8081'
const serverPort = process.argv[4] || 8080
var page:any

http
  .createServer(async function (req: any, res: any) {

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'POST' && req.url === '/data') {
      let body = ''

      // Listen for the data event to collect the request body
      req.on('data', (chunk: any) => {
        body += chunk.toString() // Convert buffer to string
      })

      // End event when all data is received
      req.on('end', async () => {
        try {
          let { data, id, path, showDiffInGrayScale } = JSON.parse(body) // Parse the received JSON

          if(!data && isHeadLess) {
            console.log('id',id)
            console.log('page',page)
            const card = await page.$(`#${id}`);
            console.log('uiComponent',card)
            data = await card?.screenshot({encoding: 'base64'});
          }

          if (!fs.existsSync(path)) {
            // If the folder itself not present -> 1st ever run of the testing library
            fs.mkdirSync(path)
          }

          const oldPath = path + '/old'
          const newPath = path + '/new'

          if (!fs.existsSync(oldPath)) {
            // If the folder itself not present -> 1st ever run of the testing library
            fs.mkdirSync(oldPath)
          }

          const oldFilePath = `${oldPath}/${id}.png`

          // if file not present -> New test
          if (!fs.existsSync(oldFilePath)) {
            try {
              await fs.writeFileSync(oldFilePath, Buffer.from(data, 'base64'))
              console.log(`Old File saved as ${oldFilePath}`)
            } catch (err) {
              console.error(`Error writing the file ${oldFilePath}:`, err)
            }
          }

          // existing test
          else {
            // file already present in /old, check if the contents match, do nothing, else create another file in /new
            const bitmap = base64_encode(oldFilePath)

            const isMatched = bitmap === data

            if (isMatched) {
              // do nothing
            } else {
              if (!fs.existsSync(newPath)) {
                // If the folder itself not present, create it
                fs.mkdirSync(newPath)
                console.log(`created the folder ${newPath}`)
              }

              const newFilePath = `${newPath}/${id}.png`
              try {
                await fs.writeFileSync(newFilePath, Buffer.from(data, 'base64'))
                console.log(`New File saved as ${newFilePath}`)
              } catch (err) {
                console.error(`Error writing the file ${newFilePath}:`, err)
              }

              const diffPath = path + '/diff'
              if (!fs.existsSync(diffPath)) {
                // If the folder itself not present, create it
                fs.mkdirSync(diffPath)
              }

              compareImages(
                newFilePath,
                oldFilePath,
                diffPath,
                id,
                showDiffInGrayScale
              )
            }
          }

          // Send response back
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({
              message: 'Screenshots generated successfully',
              data
            })
          )
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ message: 'Invalid JSON format' }))
        }
      })
    } else if (req.method === 'POST' && req.url === '/generate') {
      let body = ''
      // Listen for the data event to collect the request body
      req.on('data', (chunk: any) => {
        body += chunk.toString() // Convert buffer to string
      })

      // End event when all data is received
      req.on('end', async () => {
        try {
          const { path, maxWidth, backgroundColor, metaData } = JSON.parse(body) // Parse the received JSON

          await generateHtml(path, maxWidth, Number(serverPort), backgroundColor, metaData)

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({
              message: 'test.html generated successfully',
              path
            })
          )
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ message: 'Invalid JSON format' }))
        }
      })
    } else if (req.method === 'GET' && req.url.startsWith('/update')) {
      const parsedUrl = url.parse(req.url, true)
      let queryData = parsedUrl.query

      const { path, id, maxWidth } = queryData

      //   path = path?.toString()
      //   maxWidth = Number(maxWidth?.toString() ?? 0)

      // End event when all data is received
      try {
        const oldPath = path + '/old'
        const newPath = path + '/new'
        const diffPath = path + '/diff'

        const oldFilePath = `${oldPath}/${id}.png`
        const newFilePath = `${newPath}/${id}.png`
        const diffFilePath = `${diffPath}/${id}.png`

        try {
          await fs.copyFileSync(newFilePath, oldFilePath)
          console.log(`Succesfully copied ${oldFilePath} to ${newFilePath}`)
        } catch (err) {
          console.error(`Error copying ${oldFilePath} to ${newFilePath}:`, err)
        }

        try {
          await fs.unlinkSync(diffFilePath)
          console.log(`Succesfully deleted ${diffFilePath}`)
        } catch (err) {
          console.error(`Error deleting ${diffFilePath}:`, err)
        }
        try {
          await fs.unlinkSync(newFilePath)
          console.log(`Succesfully deleted ${newFilePath}`)
        } catch (err) {
          console.error(`Error deleting ${newFilePath}:`, err)
        }

        await generateHtml(path, maxWidth, Number(serverPort))

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            message: `Succesfully updated the test ${id}`,
            path
          })
        )
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ message: 'Invalid JSON format' }))
      }
    } else if (req.method === 'GET' && req.url.startsWith('/reset')) {
      const parsedUrl = url.parse(req.url, true)
      const { path, maxWidth } = parsedUrl.query

      // End event when all data is received
      try {
        const oldPath = path + '/old'
        const newPath = path + '/new'
        const diffPath = path + '/diff'

        if (fs.existsSync(newPath)) {
          const files = await fs.readdirSync(newPath)

          const promises = files.map(async (file) => {
            const newFilePath = newPath + '/' + file
            const oldFilePath = oldPath + '/' + file
            try {
              await fs.copyFileSync(newFilePath, oldFilePath)
              console.log(`Succesfully copied ${oldFilePath} to ${newFilePath}`)
            } catch (err) {
              console.log(
                `Error copying ${oldFilePath} to ${newFilePath}:`,
                err
              )
            }
          })

          Promise.all(promises).then(async () => {
            try {
              await fs.rmSync(diffPath, { recursive: true, force: true })
              console.log(`Succesfully deleted ${diffPath}`)
            } catch (err) {
              console.error(`Error deleting ${diffPath}:`, err)
            }
            try {
              await fs.rmSync(newPath, { recursive: true, force: true })
              console.log(`Succesfully deleted ${newPath}`)
            } catch (err) {
              console.error(`Error deleting ${newPath}:`, err)
            }

            await generateHtml(path, maxWidth, Number(serverPort))
          })
        } else {
          try {
            await fs.rmSync(diffPath, { recursive: true, force: true })
            console.log(`Succesfully deleted ${diffPath}`)
          } catch (err) {
            console.error(`Error deleting ${diffPath}:`, err)
          }

          await generateHtml(path, maxWidth, Number(serverPort))
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({ message: 'All tests updated successfully', path })
        )
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ message: 'Invalid JSON format' }))
      }
    } else {
      // Handle unsupported routes or methods
      res.writeHead(200)
      res.end(msg)
    }
  })
  .listen(serverPort, async() => {
    console.log(`Screenshot-test-server running on port ${serverPort}`)
    if(isHeadLess) {
      const browser = await puppeteer.launch({headless: true});
      console.log('browser',browser)
      page = await browser.newPage();
      await page.goto(uiUrl);
    }
    else {
      console.log(
        'Render the tests on your emulator / device and hit the "Capture and Compare" button.'
      )
    }
  })
