import * as fs from 'fs'
const resemble = require('./resemble')

async function writeDiffImage(data: any, diffPath: string, id: string) {
  const dataString = data.getImageDataUrl().split(',')[1]
  const diffFilePath = `${diffPath}/${id}.png`
  try {
    await fs.writeFileSync(diffFilePath, Buffer.from(dataString, 'base64'))
    console.log(`Diff File saved as ${diffFilePath}`)
  } catch (err) {
    console.error(`Error generating the the diff png for ${id}:`, err)
  }
}

export function compareImages(
  newFilePath: string,
  oldFilePath: string,
  diffPath: string,
  id: string,
  showDiffInGrayScale: boolean
) {
  // Paths to the images you want to compare

  if (showDiffInGrayScale) {
    resemble(oldFilePath)
      .compareTo(newFilePath)
      .ignoreColors() // Optional: Ignore colors for strict pixel comparison
      .onComplete((data: any) => writeDiffImage(data, diffPath, id))
  } else {
    {
      resemble(oldFilePath)
        .compareTo(newFilePath)
        .onComplete((data: any) => writeDiffImage(data, diffPath, id))
    }
  }
}

export function base64_encode(file: string) {
  // read binary data
  var bitmap = fs.readFileSync(file)
  // convert binary data to base64 encoded string
  return bitmap.toString('base64')
}

const rowStyle =
  'display: flex; margin: 0px 4px; padding: 5px; overflow: scroll;'
// const imageStyle = 'max-width: 300px;'

const getMetaDataHtml = (
  title: string,
  description: string,
  id: string
) => `<div style="border: 1px solid #aaa; border-radius: 2px; padding-bottom: 6px">
  <div style="background-color: #eee; display: flex;">
      <div style="background-color: #ddd; border: 1px solid lightgray; border-radius: 2px; padding: 5px 10px; cursor: pointer" onclick="onShowHide('${id}')"><i id="${
  id + 'icon'
}" class="fa fa-chevron-down"></i></div>
      <div style="padding: 6px;">${title}</div>
  </div>
  <div id="${id}" style="display: none;">
    <div style="margin-left: 10px; margin-top: 6px;">
        <span style="font-weight: bold; margin-right: 10px;">Description:</span> ${description}
    </div>
    <div style="margin-left: 10px; margin-top: 6px;">
        <span style="font-weight: bold; margin-right: 10px;">ID:</span> ${id}
    </div>
  </div>
  </div>`

async function failedHtml(
  diffPath: string,
  path: string,
  maxWidthOuter: number,
  metadata: any
) {
  let htmlStr = '',
    length = 0

  try {
    const files = await fs.readdirSync(diffPath)
    length = files.length
    files.forEach((file) => {
      const len = file.length
      const id = file.substring(0, len - 4)
      const component = metadata.components.find((item: any) => item.id === id)
      let { title, description, backgroundColor, maxWidth } = component
      maxWidth = maxWidth || maxWidthOuter

      const metaDataHtml = getMetaDataHtml(title, description, id)

      htmlStr += `<div style="border: 2px solid #D45553; border-radius: 2px; margin: 12px 5px 20px 5px; padding: 5px; overflow: scroll; font-size: 14px">
        ${metaDataHtml}
        <div class="imgContainer" style="${rowStyle} background-color: ${backgroundColor};">
        <div><h3>Original:</h3><img style="max-width: ${maxWidth}px;" src="./old/${file}" alt="./old/${file}"/></div>
        <div><h3>Modified:</h3><img style="max-width: ${maxWidth}px;" src="./new/${file}" alt="./new/${file}"/><button onclick="accept('${path}','${id}',${maxWidth})" style="background-color: #23569E; color: white; padding: 4px 8px;">Accept Changes</button></div>
        <div><h3>Diff:</h3><img style="max-width: ${maxWidth}px;" src="./diff/${file}" alt="./diff/${file}"/></div>
        </div>
  </div>`
    })
  } catch (err) {
    console.error('Unable to scan directory: ' + err)
  }

  return { htmlStr, length }
}

async function passedHtml(
  newPath: string,
  oldPath: string,
  diffPath: string,
  maxWidthOuter: number,
  metadata: any
) {
  let htmlStr = '',
    length = 0
  try {
    const files = await fs.readdirSync(oldPath)
    length = files.length
    files.forEach((file) => {
      const len = file.length
      const id = file.substring(0, len - 4)
      const component = metadata.components.find((item: any) => item.id === id)
      let { title, description, backgroundColor, maxWidth } = component
      maxWidth = maxWidth || maxWidthOuter
      const metaDataHtml = getMetaDataHtml(title, description, id)
      if (
        fs.existsSync(`${newPath}/${file}`) &&
        fs.existsSync(`${diffPath}/${file}`)
      ) {
      } else {
        htmlStr += `<div style="border: 2px solid #89AB59; border-radius: 2px; margin: 12px 5px 20px 5px; padding: 5px; overflow: scroll; font-size: 14px">
          ${metaDataHtml}
          <div class="imgContainer" style="${rowStyle} background-color: ${backgroundColor};">
          <img style="max-width: ${maxWidth}px;" src="./old/${file}" alt="./old/${file}"/>
          </div>
          </div>`
      }
    })
  } catch (err) {
    console.error('Unable to scan directory: ' + err)
  }
  return { htmlStr, length }
}

// async function allHtml(
//   newPath: string,
//   oldPath: string,
//   diffPath: string,
//   path: string,
//   maxWidthOuter: number,
//   metadata: any
// ) {
//   let htmlStr = '',
//     length = 0
//   try {
//     const files = await fs.readdirSync(oldPath)
//     length = files.length
//     files.forEach((file) => {
//       const len = file.length
//       const id = file.substring(0, len - 4)
//       const component = metadata.components.find((item: any) => item.id === id)
//       let { title, description, backgroundColor, maxWidth } = component
//       maxWidth = maxWidth || maxWidthOuter
//       const metaDataHtml = getMetaDataHtml(title, description, id)
//       if (
//         fs.existsSync(`${newPath}/${file}`) &&
//         fs.existsSync(`${diffPath}/${file}`)
//       ) {
//         htmlStr += `<div style="border: 2px solid #D45553; border-radius: 2px; margin: 12px 5px 20px 5px; padding: 5px; overflow: scroll; font-size: 14px">
//           ${metaDataHtml}
//           <div style="${rowStyle} background-color: ${backgroundColor};">
//           <div><h3>Original:</h3><img style="max-width: ${maxWidth}px;" src="./old/${file}" alt="./old/${file}"/><button onclick="accept('${path}','${id}',${maxWidth})" style="background-color: #23569E; color: white; padding: 4px 8px;">Accept Changes</button></div>
//           <div><h3>Modified:</h3><img style="max-width: ${maxWidth}px;" src="./new/${file}" alt="./new/${file}"/></div>
//           <div><h3>Diff:</h3><img style="max-width: ${maxWidth}px;" src="./diff/${file}" alt="./diff/${file}"/></div>
//           </div>
//         </div>`
//       } else {
//         htmlStr += `<div style="border: 2px solid #89AB59; border-radius: 2px; margin: 12px 5px 20px 5px; padding: 5px; overflow: scroll; font-size: 14px">
//           ${metaDataHtml}
//           <div style="${rowStyle} background-color: ${backgroundColor};">
//           <img style="max-width: ${maxWidth}px;" src="./old/${file}" alt="./old/${file}"/>
//           </div>
//           </div>`
//       }
//     })
//   } catch (err) {
//     console.error('Unable to scan directory: ' + err)
//   }
//   return { htmlStr, length }
// }

function getHtmlContent(
  diffHtmlString: string,
  passedHtmlString: string,
  path: string,
  maxWidth: number,
  all: number,
  failed: number,
  serverPort: number,
  metadata: any
) {
  const localhostUrl = 'http://127.0.0.1'
  const url = `${localhostUrl}:${serverPort}`
  const urlForUpdate = `${url}/update`
  const urlForReset = `${url}/reset`
  return `<html>
          <head>
              <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
              <script>
                  var diffHtmlString = \`${diffHtmlString}\`
                  var passedHtmlString = \`${passedHtmlString}\`
                  async function update (path,id,maxWidth) {
                    await fetch(\`${urlForUpdate}?path=\${path}&id=\${id}&maxWidth=\${maxWidth}\`)
                  }
                  async function accept (path,id,maxWidth) {
                      const res = confirm('Accept the change?')
                      if(!res) return
                      await update(path,id,maxWidth);
                      alert('Accepted the change. Please reload the page to see changes!')
                  }
                  async function reset (path,maxWidth) {
                    await fetch(\`${urlForReset}?path=\${path}&maxWidth=\${maxWidth}\`)
                  }
                  async function acceptAll (path,maxWidth) {
                    const res = confirm('Accept all changes?')
                    if(!res) return
                    await reset(path,maxWidth);
                    alert('All changes accepted. Please reload the page to see changes!')
                }
                function onShowHide(id){
                  const node = document.getElementById(id)
                  const icon = document.getElementById(id+'icon')
                  const style = node.getAttribute("style")
                  if(style){
                    node.setAttribute('style','')
                    icon.setAttribute('class','fa fa-chevron-up')
                  }
                  else{
                    node.setAttribute('style','display: none')
                    icon.setAttribute('class','fa fa-chevron-down')
                  }
                }
                function showAll() {
                  document.getElementById("mainBody").innerHTML = diffHtmlString + passedHtmlString
                  document.getElementById("chk").checked = false
                }
                function showDiff() {
                  document.getElementById("mainBody").innerHTML = diffHtmlString
                  document.getElementById("chk").checked = false
                }
                function showPassed() {
                  document.getElementById("mainBody").innerHTML = passedHtmlString
                  document.getElementById("chk").checked = false
                }
                function onloaded () {
                  let node = document.getElementById('acceptAll')
                  node.setAttribute("style","${failed ? '' : 'display: none'}")
  
                  const bdy = document.getElementsByTagName('body')[0]
                  let style = bdy.getAttribute('style')
                  bdy.setAttribute('style',style+\` border: 10px solid ${
                    failed ? '#EEB6B3' : '#C6E0C4'
                  }\`)
  
                  node = document.getElementById('header')
                  style = node.getAttribute('style')
                  node.setAttribute('style', style+\` background-color: ${
                    failed ? '#EEB6B3' : '#C6E0C4'
                  }\`)

                  node = document.getElementById('reportBox')
                  style = node.getAttribute('style')
                  node.setAttribute('style', style+\` background-color: ${
                    failed ? '#350505' : '#001e03'
                  }\`)

                  showAll();
                }

                function toggle() {
                  const nodes = document.getElementsByClassName('imgContainer')
                  if(nodes && nodes.length){
                    Array.from(nodes).forEach(node=>{
                      style = node.getAttribute('style')
                      node.setAttribute('style', style.includes('none') ? style.replace('none','flex') : style.replace('flex','none'))
                    })
                  }
                }
              </script>
          </head>
  
          <body onload="onloaded()" style="overflow: hidden; margin: 0;">
            <div id="header" style="display: flex; justify-content: space-between; padding-bottom: 10px;">
              <div>
                <input type="radio" name="choice" onclick="showAll()" checked> All </input>
                <input type="radio" name="choice" onclick="showDiff()"> Failed </input>
                <input type="radio" name="choice" onclick="showPassed()"> Passed </input>
  
                <div id="acceptAll">
                    <button style="margin-top: 10px; margin-left: 10px; padding: 6px 16px; background-color: #23569E; color: white; font-size: 14px; font-weight: bold; border-radius: 4px; cursor: pointer;" onclick="acceptAll('${path}',${maxWidth})">
                      Accept all changes
                    </button>
                </div>

                <div style="margin-top: 10px;">
                    <input id="chk" type="checkbox" onchange="toggle()">Hide images</input>
                </div>
              </div>
  
              <div id="reportBox" style="padding: 10px 24px; border-radius: 2px; width: 140px; margin-left: 10px; font-family: Arial, Helvetica, sans-serif;">
                <div style="color: wheat; display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <div>Total: </div>
                    <div>${all} </div>
                </div>
                <div style="color: #7CE77C; display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <div>Passed: </div>
                    <div>${all - failed} </div>
                </div>
                <div style="color: #F87069; display: flex; justify-content: space-between;">
                    <div>Failed: </div>
                    <div>${failed} </div>
                </div>
              </div>
            </div>
  
            <div id="mainBody" style="overflow-y: scroll; height: 90%">
            </div>
          </body>
  </html>
  `
}

export const msg = `
  <div>
    <h2>Welcome to screenshot Testing!</h2>
    <p>
      To see the screenshots, open the <span style="color: blue;">test.html</span> file which is generated inside the path you provided in the <b>withScreenShot</b> function.
    </p>
  </div
  `

export async function generateHtml(
  path: any,
  maxWidth: any,
  serverPort: number,
  backgroundColor?: string,
  metadataParam?: any
) {
  const oldPath = path + '/old'
  const newPath = path + '/new'
  const diffPath = path + '/diff'

  let metadata = metadataParam

  if (metadata) {
    metadata = {
      ...metadata,
      components: metadata.components.map((item: any) => ({
        ...item,
        title: item.title.replaceAll('`', '"').replaceAll("'", '"'),
        id: item.id.replaceAll('`', '"').replaceAll("'", '"'),
        backgroundColor: item.backgroundColor || backgroundColor
      }))
    }
    try {
      const metadataPath = path + '/metadata.json'
      await fs.writeFileSync(metadataPath, JSON.stringify(metadata))
      console.log(`Metadata file saved as ${metadataPath}`)
    } catch (err) {
      console.error('error while writing metadata file', err)
    }
  } else {
    const metadataStr = await fs.readFileSync(path + '/metadata.json')
    metadata = JSON.parse(metadataStr.toString())
  }

  const { htmlStr: diffHtmlString, length: failed } = await failedHtml(
    diffPath,
    path,
    maxWidth,
    metadata
  )

  const { htmlStr: passedHtmlString, length: passed } = await passedHtml(
    newPath,
    oldPath,
    diffPath,
    maxWidth,
    metadata
  )
  const all = failed + passed

  const finalHtmlString = getHtmlContent(
    diffHtmlString,
    passedHtmlString,
    path,
    maxWidth,
    all,
    failed,
    serverPort,
    metadata
  )

  try {
    await fs.writeFileSync(path + '/test.html', finalHtmlString)
    console.log(`HTML File saved as ${path + '/test.html'}`)
  } catch (err) {
    console.error('Error writing the test.html file:', err)
  }
}
