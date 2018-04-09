'use strict'

const runApi = 'https://api.runmycode.online/run'
const sampleCodes = {
  nodejs: [
    'console.log("Hello World from Nodejs!")',
    'const args = process.argv.slice(2)',
    'console.log(args.length + " Args: [" + args.join(", ") + "]")'
  ].join('\n'),
  c: [
    '#include <stdio.h>',
    'int main(int argc, char* argv[]) {',
    '  printf("Hello World from C!\\n");',
    '  printf("%d Args: [", argc - 1);',
    '  int i;',
    '  for(i = 1; i < argc; ++i)',
    '    printf("%s ", argv[i]);',
    '  printf("]\\n");',
    '  return 0;',
    '}'
  ].join('\n'),
  cpp: [
    '#include <iostream>',
    'using namespace std;',
    'int main(int argc, char **argv) {',
    '  cout << "Hello World from C++!\\n";',
    '  cout << (argc - 1) << " Args: [";',
    '  for (int i = 1; i < argc; ++i)',
    '    cout << argv[i] << " ";',
    '  cout << "]\\n";',
    '  return 0;',
    '}'
  ].join('\n'),
  java: [
    'import java.util.Arrays;',
    'class HelloWorld {',
    '  public static void main(String[] args) {',
    '    System.out.println("Hello World from Java!");',
    '    System.out.println(args.length + " Args: " + Arrays.toString(args));',
    '  }',
    '}'
  ].join('\n'),
  python: [
    'import sys',
    'print "Hello World from Python!"',
    'args = sys.argv[1:]',
    'print str(len(args)) + " Args: [" + ", ".join(args) + "]"'
  ].join('\n'),
  python3: [
    'import sys',
    'print("Hello World from Python3!")',
    'args = sys.argv[1:]',
    'print(str(len(args)) + " Args: [" + ", ".join(args) + "]")'
  ].join('\n'),
  ruby: [
    'puts("Hello World from Ruby!")',
    'puts("#{ARGV.length} Args: [#{ARGV.join(", ")}]")'
  ].join('\n'),
  php: [
    '<?php',
    '  echo "Hello World from PHP!\\n";',
    '  $args = array_slice($argv, 1);',
    '  echo count($args), " Args: [", implode(", ", $args), "]\\n";',
    '?>'
  ].join('\n'),
  go: [
    'package main',
    'import "os"',
    'import "fmt"',
    'import "strings"',
    'func main() {',
    '  fmt.Println("Hello World from Go!")',
    '  args := os.Args[1:]',
    '  fmt.Println(fmt.Sprintf("%v Args: [%v]", len(args), strings.Join(args, ", ")))',
    '}'
  ].join('\n')
}

// https://stackoverflow.com/a/39008859
const injectScript = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.async = true
    script.src = src
    script.addEventListener('load', resolve)
    script.addEventListener('error', () => reject(new Error('Error loading script.')))
    script.addEventListener('abort', () => reject(new Error('Script loading aborted.')))
    document.head.appendChild(script)
  })
}

let lang = 'nodejs'
// custom map for CodeMirror
const langMap = {
  nodejs: 'javascript',
  c: 'clike',
  cpp: 'clike',
  java: 'clike',
  python3: 'python'
}
let langToLoad = langMap[lang] || lang
const langLoaded = [langToLoad]

const wrapper = $('#code-wrapper')
const langSelect = $('#language')
const popUpRunnerBtn = $('#popup-runner')

let myCodeMirror
const initEditor = () => {
  wrapper.textContent = '' // remove Loading...
  myCodeMirror = CodeMirror(wrapper, {
    value: sampleCodes[lang],
    mode: langToLoad,
    lineNumbers: true,
    viewportMargin: Infinity
  })
  // make them visible
  langSelect.style.display = 'inline'
  popUpRunnerBtn.style.display = 'inline'
}

// update with new code
const updateEditor = () => {
  myCodeMirror.setOption('mode', langToLoad)
  myCodeMirror.setOption('value', sampleCodes[lang])
}

langSelect.addEventListener('change', (e) => {
  lang = e.target.value
  langToLoad = langMap[lang] || lang
  if (langLoaded.indexOf(langToLoad) === -1) {
    myCodeMirror.setOption('value', 'Loading...')
    injectScript(`codemirror/mode/${langToLoad}/${langToLoad}.js`)
    .then(() => {
      updateEditor()
      langLoaded.push(langToLoad)
    })
  } else {
    updateEditor()
  }
})

// similar to browser extension
const platformMap = {
  runmycode: {
    pages: {
      edit: {
        getCode: () => myCodeMirror.getValue()
      }
    }
  }
}

let runnerAdded = false
const platform = 'runmycode'
const page = 'edit'

const initRunner = () => {
  if (runnerAdded) return

  runnerAdded = true
  const runnerWidth = 350

  const runnerMarkup = `<style>
  #runmycode-runner {
    width: ${runnerWidth}px;
  }
  </style>

  <div id="runmycode-runner">
    <div class="panel panel-default">
      <div id="runmycode-runner-handle" class="panel-heading">
        <button id="runmycode-close-runner" type="button" class="close">x</button>
        <h3 class="panel-title">RunMyCode Online</h3>
      </div>
      <div class="panel-body">
        <button id="runmycode" type="button" class="btn btn-warning btn-block btn-lg">Run</button>
        <div class="panel-group">
          <div class="panel panel-default panel-runner">
            <div class="panel-heading" title="Command line input to Code">
              <h4 class="panel-title">Input</h4>
            </div>
            <div class="panel-collapse collapse">
              <div class="panel-body">
                <input id="runmycode-run-input" placeholder="Command line input to Code" title="Special shell characters like & should be quoted" type="text">
              </div>
            </div>
          </div>
          <div class="panel panel-default panel-runner">
            <div class="panel-heading" title="Output from Code">
              <h4 class="panel-title">Output</h4>
            </div>
            <div id="output-panel" class="panel-collapse collapse in">
              <div class="panel-body">
                <textarea id="runmycode-run-output" rows="4" placeholder="Output from Code" readonly="true"></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `
  // inject runner styles and markup
  document.body.insertAdjacentHTML('afterbegin', runnerMarkup)

  /* *** Start Movable popup https://gist.github.com/akirattii/9165836 ****/

  let runnerVisible = false
  const runner = $('#runmycode-runner')
  const runnerCloseBtn = $('#runmycode-close-runner')
  const runBtn = $('#runmycode')
  const runInput = $('#runmycode-run-input')
  const runOutput = $('#runmycode-run-output')

  let runnerOffset = { x: 0, y: 0 }
  runner.style.left = `${(window.innerWidth - runnerWidth) / 2}px` // have popup in the center of the screen

  runnerCloseBtn.addEventListener('click', (e) => {
    runner.style.display = 'none'
    runnerVisible = false
  })
  // close popup on ESC key
  window.addEventListener('keydown', (e) => {
    if (e.keyCode === 27) runnerCloseBtn.click(e)
  })

  const popupMove = (e) => {
    runner.style.top = `${e.clientY - runnerOffset.y}px`
    runner.style.left = `${e.clientX - runnerOffset.x}px`
  }

  window.addEventListener('mouseup', () => {
    window.removeEventListener('mousemove', popupMove, true)
  })

  $('#runmycode-runner-handle').addEventListener('mousedown', (e) => {
    runnerOffset.x = e.clientX - runner.offsetLeft
    runnerOffset.y = e.clientY - runner.offsetTop
    window.addEventListener('mousemove', popupMove, true)
    e.preventDefault() // disable text selection
  })

  popUpRunnerBtn.addEventListener('click', (e) => {
    e.preventDefault()
    if (runnerVisible) {
      runnerCloseBtn.click(e)
    } else {
      runnerVisible = true
      runner.style.display = 'block'
    }
  })

  /* *** End Movable popup ****/

  // collapse input, output panels
  Array.from($$('.panel-runner>.panel-heading')).forEach((el) => {
    el.addEventListener('click', (ev) => {
      ev.target.closest('.panel-heading').nextElementSibling.classList.toggle('in')
    })
  })

  const callApi = (url, apiKey) => {
    fetch(url, {
      method: 'post',
      headers: {'x-api-key': apiKey},
      body: platformMap[platform]['pages'][page].getCode()
    })
    .then(res => res.json())
    .then((resp) => {
      console.log('Run response', resp)
      runOutput.classList.add('error')
      if (resp.status === 'Successful') {
        runOutput.classList.remove('error')
        runOutput.value = resp.stdout || resp.stderr
      } else if (resp.status === 'Failed' || resp.status === 'BadRequest') {
        runOutput.value = `Failed: ${resp.error}${resp.stdout}` // stdout for php which puts error in stdout
      } else if (resp.message === 'Forbidden') {
        runOutput.value = 'Are you tinkering? You can do so here: https://github.com/shatgupt/runmycode.online'
      } else {
        runOutput.value = 'Some error happened. Please try again later.' // what else do I know? :/
      }
      runBtn.disabled = false // enable run button
    })
    .catch((error) => {
      console.error('Error:', error)
      runOutput.classList.add('error')
      runOutput.value = 'Some error happened. Please try again later.' // what else do I know? :/
      runBtn.disabled = false
    })
  }

  runBtn.addEventListener('click', (e) => {
    runBtn.disabled = true // disable run button
    // console.log(`Running ${lang} code`)
    runOutput.classList.remove('error')
    runOutput.value = `Running ${lang} code...`
    $('#output-panel').classList.add('in')

    const url = `${runApi}/${lang}?platform=codesheet&args=${encodeURIComponent(runInput.value)}`
    callApi(url, user.key)
  })
}

if (user.key) {
  initEditor()
  initRunner()
}
