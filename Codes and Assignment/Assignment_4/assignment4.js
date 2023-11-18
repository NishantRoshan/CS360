var contrast = 0;
var brightness = 1;

const sharpeningMatrix = new Float32Array([
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
]);
const definingMatrix = new Float32Array([
    0, 0, 0,
    0, 1, 0,
    0, 0, 0
]);
const laplacianMatrix = new Float32Array([
    0, -4, 0,
    -4, 16, -4,
    0, -4, 0
]);
const smootheningMatrix = new Float32Array([
    0.11111, 0.11111, 0.11111,
    0.11111, 0.11111, 0.11111,
    0.11111, 0.11111, 0.11111
]);
var spVerts = [];
var spIndicies = [];
var spNormals = [];
var spTexCoords = [];
var matrixStack = [];
  
// initialize model, view, and projection matrices
var vMatrix = mat4.create(); // view matrix
var mMatrix = mat4.create(); // model matrix
var pMatrix = mat4.create(); //projection matrix

var animation;
  

// Vertex shader code, per fragment shading 
const vscfrag = `#version 300 es

in vec3 aPosition;
in vec3 aNormal;
in vec2 aTextC;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

out vec3 oPosition;
out vec3 oNormal;
out vec2 oTextC;


void main() {
    gl_Position = vec4(aPosition,1.0);

    oPosition = aPosition;
    oNormal = aNormal;
    oTextC = aTextC;

}`;

// Fragment shader code, per fragment shading
const fscfrag = `#version 300 es
precision highp float;

in vec3 oPosition;
in vec3 oNormal;
in vec2 oTextC;

uniform vec4 objColor;
uniform sampler2D back;
uniform sampler2D fore;

uniform float contrast;
uniform float brightness;

uniform int bob;
uniform int gos;
uniform int processBackground;

uniform mat3 kernel;
uniform vec2 imgSize;

out vec4 fragColor;

void main() {
    vec4 col = vec4(0.0,0.0,0.0,1.0);
  
    vec2 pixSize = 1.0 / imgSize;
  
    if (processBackground == 3) {
      vec3 up = texture(back, oTextC + vec2(0.0,1.0)*pixSize).rgb;
      vec3 down = texture(back, oTextC + vec2(0.0,-1.0)*pixSize).rgb;
      vec3 right = texture(back, oTextC + vec2(1.0,0.0)*pixSize).rgb;
      vec3 left = texture(back, oTextC + vec2(-1.0,0.0)*pixSize).rgb;
      vec3 dy = (up-down)*0.5;
      vec3 dx = (right-left)*0.5;
      col = vec4(sqrt(dx*dx+ dy*dy),1.0);
    }else{
      for (int i = -1; i <= 1; i++) {
          for (int j = -1; j <= 1; j++) {
              vec2 offset = vec2(float(i), float(j)) * pixSize;
              col.rgb += texture(back, oTextC + offset).rgb * kernel[i+1][j+1];
          }
      }
    }  
  
    if (bob==0){
      col = vec4(vec3(0.0),1.0);
    } else if (bob==2){
      vec4 f = texture(fore,oTextC);
      col = col*(1.0-f.a) + f*f.a;
    }
  
    if (gos == 1){
      float gray = dot(col.rgb, vec3(0.2126, 0.7152, 0.0722));
      col = vec4(vec3(gray),1.0);
    }else if (gos == 2){
      vec4 sep;
      sep.r = 0.393*col.r + 0.769*col.g + 0.189*col.b;
      sep.g = 0.349*col.r + 0.686*col.g + 0.168*col.b;
      sep.b = 0.272*col.r + 0.534*col.g + 0.131*col.b;
      col.rbg = sep.rbg;
    }
    
    col.rgb = 0.5 + (contrast + 1.0) * (col.rgb - 0.5);
    col.rgb = brightness * col.rgb;

    fragColor = vec4(col.rgb,1.0);
  }`;


function vertexShaderSetup(vertexShaderCode) {
    shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, vertexShaderCode);
    gl.compileShader(shader);
    // Error check whether the shader is compiled correctly
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.log(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
}

function fragmentShaderSetup(fragShaderCode) {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, fragShaderCode);
    gl.compileShader(shader);
    // Error check whether the shader is compiled correctly
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.log(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
}

function initShaders(vsc, fsc) {
    shaderProgram = gl.createProgram();
  
    var vertexShader = vertexShaderSetup(vsc);
    var fragmentShader = fragmentShaderSetup(fsc);
  
    // attach the shaders
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    //link the shader program
    gl.linkProgram(shaderProgram);
  
    // check for compilation and linking status
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.log(gl.getShaderInfoLog(vertexShader));
      console.log(gl.getShaderInfoLog(fragmentShader));
    }
  
    //finally use the program.
    return shaderProgram;
}

function initGL(canvas) {
    try {
      gl = canvas.getContext("webgl2", {preserveDrawingBuffer: true}); // the graphics webgl2 context
      gl.viewportWidth = canvas.width; // the width of the canvas
      gl.viewportHeight = canvas.height; // the height
    } catch (e) {}
    if (!gl) {
      console.log("WebGL initialization failed");
    }
}

function pushMatrix(stack, m) {
    //necessary because javascript only does shallow push
    var copy = mat4.create(m);
    stack.push(copy);
}

function popMatrix(stack) {
    if (stack.length > 0) return stack.pop();
    else console.log("stack has no matrix to pop!");
}
  
function degToRad(degrees) {
    return (degrees * Math.PI) / 180;
}

// Get a reference to the input element by its ID
const backgroundImageInput = document.getElementById("backgroundImage");
const foregroundImageInput = document.getElementById("foregroundImage");

// Add an event listener to the input element
backgroundImageInput.addEventListener("change", function () {
  const selectedFile = this.files[0];
  loadImage(selectedFile, gl.TEXTURE1);
});

foregroundImageInput.addEventListener("change", function () {

    const selectedFile = this.files[0];
    loadImage(selectedFile, gl.TEXTURE2);
  
});

function loadImage(input, texUnit){
    
    file = input;
    
    if(file){
        const reader = new FileReader();
        reader.onload = function(e) {
            gl.activeTexture(texUnit);
            initTextures(e.target.result);
        }
        reader.readAsDataURL(file);
    }
}

function initTextures(textureFile) {
    var tex = gl.createTexture();
    tex.image = new Image();
    tex.image.src = textureFile;
    tex.image.onload = function () { 
      handleTextureLoaded(tex);
    };
    return tex;
  }

  function handleTextureLoaded(texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
  //   gl.pixelStorei(gl.UNPACK_FLIP_Z_WEBGL, 1); // use it to flip Y if needed
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(
      gl.TEXTURE_2D, // 2D texture
      0, // mipmap level
      gl.RGBA, // internal format
      gl.RGBA, // format
      gl.UNSIGNED_BYTE, // type of data
      texture.image // array or <img>
    );
  
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR
    );

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform2fv(uimgSizeLocation, new Float32Array([texture.image.width,texture.image.height]))
  
    drawScene();
  }


const backgroundOnly = document.getElementById("backgroundOnly");
const blend = document.getElementById("blend");

backgroundOnly.addEventListener("change", function () {
    backgroundOrBlend(1);
});

blend.addEventListener("change", function () {
    backgroundOrBlend(2);
});

const gray = document.getElementById("gray");
const sepia = document.getElementById("sepia");

gray.addEventListener("change", function () {
    grayOrSepia(1);
});

sepia.addEventListener("change", function () {
    grayOrSepia(2);
});

function backgroundOrBlend(val) {
    gl.uniform1i(ubobLocation, val);
}
function grayOrSepia(val) {
    gl.uniform1i(ugosLocation, val);
}

const smooth = document.getElementById("smooth");
const sharp = document.getElementById("sharp");
const gradient = document.getElementById("gradient");
const laplacian = document.getElementById("laplacian");

smooth.addEventListener("change", function () {
    processBackground(1);
});
sharp.addEventListener("change", function () {
    processBackground(2);
});
gradient.addEventListener("change", function () {
    processBackground(3);
});
laplacian.addEventListener("change", function () {
    processBackground(4);
});

function processBackground(val) {
    gl.uniform1i(uprocessBackgroundLocation, val);
    if(val == 1){
        gl.uniformMatrix3fv(ukernelLocation, false, smootheningMatrix);
        return;
    }
    if(val == 2){
        gl.uniformMatrix3fv(ukernelLocation, false, sharpeningMatrix);
        return;
    }
    if(val == 3){
        gl.uniformMatrix3fv(ukernelLocation, false, definingMatrix);
        return;
    }
    if(val == 4){
        gl.uniformMatrix3fv(ukernelLocation, false, laplacianMatrix);
        return;
    }
}

function initSquareBuffer() {
    // buffer for point locations
    const sqVertices = new Float32Array([
      1, 1, 0, -1, 1, 0, -1, -1, 0, 1, -1, 0
    ]);
    sqVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
    sqVertexPositionBuffer.itemSize = 3;
    sqVertexPositionBuffer.numItems = 4;

    const sqNormals = new Float32Array([
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1
    ]);
    sqVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sqNormals, gl.STATIC_DRAW);
    sqVertexNormalBuffer.itemSize = 3;
    sqVertexNormalBuffer.numItems = 4;
  
    // buffer for point indices
    const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    sqVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
    sqVertexIndexBuffer.itemsize = 1;
    sqVertexIndexBuffer.numItems = 6;

    // buffer for point indices
    const sqTextC = new Float32Array([0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0]);
    sqTextCBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sqTextCBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sqTextC, gl.STATIC_DRAW);
    sqTextCBuffer.itemSize = 2;
    sqTextCBuffer.numItems = 4;
}
  
function drawSquare(color) {

// buffer for point locations
gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
gl.vertexAttribPointer(
    aPositionLocation,
    sqVertexPositionBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
);

gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexNormalBuffer);
gl.vertexAttribPointer(
    aNormalLocation,
    sqVertexNormalBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
);

// buffer for point locations
gl.bindBuffer(gl.ARRAY_BUFFER, sqTextCBuffer);
gl.vertexAttribPointer(
    aTextCLocation,
    sqTextCBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
);
    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);

    gl.uniform4fv(uColorLocation, color);
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
    gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
    gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
    
    // now draw the square
    gl.drawElements(
        gl.TRIANGLES,
        sqVertexIndexBuffer.numItems,
        gl.UNSIGNED_SHORT,
        0
    );
}

function drawScene() {
    
    if (animation) {
        window.cancelAnimationFrame(animation);
    }

    var animate = function () {
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // set up the view matrix, multiply into the modelview matrix
        mat4.identity(vMatrix);
        // vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);
    
        //set up perspective projection matrix
        mat4.identity(pMatrix);
        // pMatrix = mat4.perspective(45, 1.0, 0.1, 1000, pMatrix);
        drawSquare([0,0,0,1]);
        
        animation = window.requestAnimationFrame(animate);
    }
    animate();
  }

function setuniform(shaderProgram){
    gl.useProgram(shaderProgram);
    gl.enable(gl.DEPTH_TEST);
    //get locations of attributes and uniforms declared in the shader
    aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
    aTextCLocation = gl.getAttribLocation(shaderProgram, "aTextC");
    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
    uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
    uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
    uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");

    uBackgroundLocation = gl.getUniformLocation(shaderProgram, "back");
    gl.uniform1i(uBackgroundLocation, 1);
    uForegroundLocation = gl.getUniformLocation(shaderProgram, "fore");
    gl.uniform1i(uForegroundLocation, 2);

    ubobLocation = gl.getUniformLocation(shaderProgram, "bob");
    gl.uniform1i(ubobLocation, 0);
    ugosLocation = gl.getUniformLocation(shaderProgram, "gos"); 
    gl.uniform1i(ugosLocation, 0);
    
    //enable the attribute arrays
    gl.enableVertexAttribArray(aPositionLocation);
    gl.enableVertexAttribArray(aNormalLocation);
    gl.enableVertexAttribArray(aTextCLocation);

    // gl.uniform3fv(uLightPosLoc, lightpos);
    // gl.uniform3fv(uEyePosLoc, eyePos);
    mat4.identity(mMatrix);

    uprocessBackgroundLocation = gl.getUniformLocation(shaderProgram, "processBackground");

    ukernelLocation = gl.getUniformLocation(shaderProgram, 'kernel');
    uimgSizeLocation = gl.getUniformLocation(shaderProgram, 'imgSize');

    ucontrastLocation = gl.getUniformLocation(shaderProgram, "contrast");
    ubrightnessLocation = gl.getUniformLocation(shaderProgram, "brightness");

    gl.uniformMatrix3fv(ukernelLocation, false, definingMatrix);
    gl.uniform1f(ucontrastLocation, contrast);
    gl.uniform1f(ubrightnessLocation, brightness);
}

// This is the entry point from the html
function webGLStart() {
    canvas = document.getElementById("assignment4");
    
    // initialize WebGL
    initGL(canvas);
    initSquareBuffer();
  
    // initialize shader program
    fragshaderProgram = initShaders(vscfrag, fscfrag);
    setuniform(fragshaderProgram);

    drawScene();
  }

var slider = document.getElementById("ContrastSlider");
slider.oninput = function() {
  contrast = this.value;
  gl.uniform1f(ucontrastLocation, contrast);
}
var slider = document.getElementById("BrightnessSlider");
slider.oninput = function() {
  brightness = this.value;
  gl.uniform1f(ubrightnessLocation, brightness);
}

const screenshotButton = document.getElementById("screenshot");

screenshotButton.addEventListener("click", function() {
    canvas.toBlob((blob) => {
        saveBlob(blob, `screencapture.png`);
    });
});

const saveBlob = (function() {
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    return function saveData(blob, fileName) {
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
    };
}());