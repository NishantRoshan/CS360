var spBuf;
var spIndexBuf;
var spNormalBuf;

var spVerts = [];
var spIndicies = [];
var spNormals = [];

var matrixStack = [];

var gl;
var canvas;

var buf;
var indexBuf;
var cubeNormalBuf;
var aPositionLocation;
var uColorLocation;
var uPMatrixLocation;
var uMMatrixLocation;
var uVMatrixLocation;

var face_degree1 = 0.0;
var face_degree0 = 0.0;
var vert_degree1 = 0.0;
var vert_degree0 = 0.0;
var frag_degree1 = 0.0;
var frag_degree0 = 0.0;

var prevMouseX = 0.0;
var prevMouseY = 0.0;

// initialize model, view, and projection matrices
var vMatrix = mat4.create(); // view matrix
var mMatrix = mat4.create(); // model matrix
var pMatrix = mat4.create(); //projection matrix

// specify camera/eye coordinate system parameters
var eyePos = [0.0, 0.3, 2.0];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];

var lightpos = [-10,-10,-10];

var lslider = document.getElementById("lightpos");
var camslider = document.getElementById("campos");

lslider.oninput = function() {
  lightpos[0] = -this.value;
  drawScene();
}
camslider.oninput = function() {
    eyePos[2] = this.value;
    drawScene();
}

// Vertex shader code, per fragment shading 
const vscfrag = `#version 300 es
in vec2 aPosition;

void main() {
  
  gl_Position = vec4(aPosition,0.0,1.0));
  gl_PointSize=5.0;
}`;

// Fragment shader code, per fragment shading
const fscfrag = `#version 300 es
precision mediump float;
in vec3 normal;
in vec3 pos;

struct Ray {
	vec3 origin;
	vec3 direction;
};

struct Sphere {
	vec3     center;
	float    radius;
	float spec;
  vec3 color;
};

struct HitInfo {
	float    t;
	vec3     normal;
  vec3 pos;
  int sph;
  Material mtl;
};
uniform vec4 objColor;
uniform vec3 lightpos;

uniform int bounceLimit;

out vec4 fragColor;
HitInfo IntersectRay(Ray ray, Sphere sphere) {
  bool foundHit = false;
  HitInfo hit;
  vec3 oc = ray.origin - sphere.center;
  float a = dot(ray.direction, ray.direction);
  float b = 2.0 * dot(oc, ray.direction);
  float c = dot(oc, oc) - (sphere.radius * sphere.radius);

  float discriminant = b * b - 4.0 * a * c;

  if (discriminant > 0.0) {
    foundHit = true;
    float t1 = (-b - sqrt(discriminant)) / (2.0 * a);
    float t2 = (-b + sqrt(discriminant)) / (2.0 * a);
    float t = (t1 < t2) ? t1 : t2;
    if(t>0.0)
    {
      foundHit = true;
      hit.t = t;
      hit.normal = normalize(ray.origin + t*(ray.direction) - sphere.center);
      hit.mtl = sphere.mtl;
      hit.pos = ray.origin + t*(ray.direction);
    }
  }

  if(!foundHit){
    hit.t = 0.0;
  }

  return hit;
}

vec3 phong(Material mtl,
            vec3 incident, vec3 normal,
            vec3 viewDir)
{
  
  vec3 amb = 0.4*vec3(objColor);

  vec3 lightdr = normalize(-lightpos);
  vec3 color = vec3(objColor);

  vec3 diff = 1.5*max(0.0,dot(lightdr,normal))*color;

  vec3 R = normalize(-reflect(lightdr,normal));
  vec3 V = normalize(-pos);

  vec3 spec = vec3(1.0,1.0,1.0)*pow(max(0.0,dot(R,V)),25.0);

  vec3 col = amb + diff + spec;
  fragColor = vec4(col, 1.0);
}

bool check_sh(vec3 pos, int sph){
  Ray rt;
  rt.origin = uLightPos;
  rt.direction = normalize(pos-rt.origin);
  float t_org = length(pos-rt.origin);
  for ( int i=0; i<NUM_SPHERES; ++i ) {
    if(i == sph)continue;
    HitInfo temp = IntersectRay(rt, spheres[i]);
    if(temp.t > 0.0 && t_org - temp.t > 1.0 ){
      return true;
    }
  }
  return false;
}

vec3 go_bouncy(Ray incoming){

  vec3 fCol = vec3(0.0,0.0,0.0);

  for ( int i=0; i<bounceLimit; ++i ) {
    HitInfo hit;
    hit.t = 0.0;

    for ( int i=0; i<4; ++i ) {
      HitInfo temp = IntersectRay(incoming, spheres[i]);
      if(hit.t == 0.0 || (temp.t >0.0 && temp.t < hit.t)){
        hit = temp;
        hit.sph = i;
      }
    }

    if (hit.t == 0.0){
      break;
    }

    vec3 inci = normalize(hit.pos-uLightPos);
    fCol += 0.5*phong(hit.mtl, inci, hit.normal, -incoming.direction);
    fCol/=1.5;

    if(i==0 && shadow && check_sh(hit.pos, hit.sph)){
      fCol *= 0.2;
    }

    incoming.direction = normalize(reflect(incoming.direction, hit.normal));
    incoming.origin = hit.pos;
	}

  return fCol;

}

void main() {
  Ray ray;
  // create the ray for current frag
  ray.origin = uCamPos;

  // direction is through each screen fragment in negative z direction
  vec2 screenPos = gl_FragCoord.xy/vec2(cnvWid, cnvHei);
  ray.direction = normalize(vec3(screenPos * 2.0 - 1.0, -1.0));

  vec3 fCol = go_bouncy(ray);

  fragColor = vec4(fCol, 1.0);

}
void main() {


}`;

function vertexShaderSetup(vertexShaderCode) {
    shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, vertexShaderCode);
    gl.compileShader(shader);
    // Error check whether the shader is compiled correctly
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(gl.getShaderInfoLog(shader));
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
      alert(gl.getShaderInfoLog(shader));
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
      gl = canvas.getContext("webgl2"); // the graphics webgl2 context
      gl.viewportWidth = canvas.width; // the width of the canvas
      gl.viewportHeight = canvas.height; // the height
    } catch (e) {}
    if (!gl) {
      alert("WebGL initialization failed");
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

function initSquareBuffer() {
  // buffer for point locations
  const sqVertices = new Float32Array([1,1,-1,1,-1,-1,1,-1]);
  sqVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
  sqVertexPositionBuffer.itemSize = 2;
  sqVertexPositionBuffer.numItems = 4;

  // buffer for point indices
  const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  sqVertexIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
  sqVertexIndexBuffer.itemsize = 1;
  sqVertexIndexBuffer.numItems = 6;
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

  // buffer for point indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);

  gl.uniform3fv(uColorLocation, color);

  // now draw the square
  gl.drawElements(
    mode,
    sqVertexIndexBuffer.numItems,
    gl.UNSIGNED_SHORT,
    0
  );
}

//////////////////////////////////////////////////////////////////////
//Main drawing routine
function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

  // stop the current loop of animation
  if (animation) {
    window.cancelAnimationFrame(animation);
  }

  var animate = function () {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    setup_shader(frag_shader);
  
    drawSquare([0.0, 0.0, 0.0]);
  
    animation = window.requestAnimationFrame(animate);
  }

  animate();
  }
  
function setuniform(shaderProgram){
    gl.useProgram(shaderProgram);
    // gl.enable(gl.DEPTH_TEST);
    //get locations of attributes and uniforms declared in the shader
    aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    
    uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");
    uLightPosLoc = gl.getUniformLocation(shaderProgram,"lightpos");

  
    //enable the attribute arrays
    gl.enableVertexAttribArray(aPositionLocation);
    

    gl.uniform3fv(uLightPosLoc, lightpos);
    
}

function init_sph(){}
  
  // This is the entry point from the html
  function webGLStart() {
    canvas = document.getElementById("assignment5");
    
    // initialize WebGL
    initGL(canvas);
  
    // initialize shader program
    flatshaderProgram = initShaders(vscflat, fscflat);
  
    init_sph();

    //initialize buffers for the cube and sphere
    initSquareBuffer();
    drawScene();
  }
  