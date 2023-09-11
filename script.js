var gl;
var canvas;

// this variable will be used to give specular effect/highlight to sphere only
var objectType;

//square and sphere variables
var buf;
var indexBuf;
var spBuf;
var spIndexBuf;
var spNormalBuf;
var spVerts = [];
var spIndicies = [];
var spNormals = [];

var aPositionLocation;
var uColorLocation;
var uPMatrixLocation;
var uMMatrixLocation;
var uVMatrixLocation;

var degree1 = 0.0;
var degree0 = 0.0;
var prevMouseX = 0.0;
var prevMouseY = 0.0;

// initialize model, view, and projection matrices
var vMatrix = mat4.create(); // view matrix
var mMatrix = mat4.create(); // model matrix
var pMatrix = mat4.create(); //projection matrix
var matrixStack = [];

//i will add event listener to this range input
const eyeRange = document.getElementById("eyeRange");
var eyeValue = parseFloat(eyeRange.value);

// specify camera/eye coordinate system parameters
var eyePos = [0.0, 0.0, eyeValue];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];

// Vertex and fragment shader codes for flat shading
const vertexShaderCode1 = `#version 300 es
in vec3 aPosition;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
out vec3 fragPosition;

void main() {
  mat4 projectionModelView;
  projectionModelView = uPMatrix*uVMatrix*uMMatrix;
  gl_Position = projectionModelView*vec4(aPosition,1.0);
  fragPosition = (uMMatrix * vec4(aPosition, 1.0)).xyz;
  gl_PointSize=10.0;
}`;

const fragShaderCode1 = `#version 300 es
precision mediump float;
in vec3 fragPosition;
uniform vec3 lightDirection;
uniform vec3 ambientColor;
uniform vec3 diffuseColor;
uniform vec3 specularColor;
uniform float shininess;
uniform float objectType;
uniform vec4 objColor;
out vec4 fragColor;

void main() {
  vec3 v1 = dFdx(fragPosition);
  vec3 v2 = dFdy(fragPosition);
  vec3 normal = normalize(cross(v1, v2)); //N, computing face normal and normalizing it
  
  vec3 lightEyeSpace = lightDirection - fragPosition;
  
  vec3 lightDir = normalize(lightEyeSpace); //L, unit vector in the direction of light source
  
  vec3 reflection = normalize(reflect(lightDir, normal));
  
  vec3 viewVec = normalize(-fragPosition);//E
  
  float diffuse = max(dot(normal, lightDir), 0.0);
  
  float specular = 0.0;
  if(objectType == 1.0){
    specular = pow(max(dot(reflection, viewVec), 0.0), shininess);
  }
  
  vec3 Iamb = ambientColor;
  vec3 Idiff = diffuseColor * diffuse;
  
  vec3 Ispec = specularColor * specular;

  vec3 finalColor = Iamb + Idiff + Ispec;

  fragColor = objColor*vec4(finalColor, 1.0);
}`;

// Vertex and fragment shader codes for gouraud shading
const vertexShaderCode2 = `#version 300 es
precision mediump float;

in vec3 aPosition; //incoming vertices
in vec3 aNormal; //incoming normals

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform vec3 ambientColor;
uniform vec3 diffuseColor;
uniform vec3 specularColor;
uniform vec3 lightDirection; //(or lightPosition) basically, position of the light source
uniform float shininess;
uniform float objectType;
uniform vec4 objColor;

out vec4 vertexColor;

void main() {

  vec3 vertPosition = (uVMatrix * uMMatrix * vec4(aPosition, 1.0)).xyz;

  mat4 normalMatrix = transpose(inverse(uVMatrix * uMMatrix));
  vec3 vNormal = (normalMatrix * vec4(aNormal, 1.0)).xyz;

  mat4 projectionModelView;
  projectionModelView=uPMatrix*uVMatrix*uMMatrix;
  gl_Position = projectionModelView*vec4(aPosition,1.0);

  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(lightDirection - vertPosition);
  vec3 reflection = reflect(-lightDir, normal); //reflection vector
  vec3 viewVec = normalize(-vertPosition); //viewers vector

  float specular = 0.0;
  if(objectType == 1.0){
    specular = pow(max(dot(reflection, viewVec), 0.0), shininess);
  }
  
  float diffuse = max(dot(normal, lightDir), 0.0);

  vec3 Iamb = ambientColor;
  
  vec3 Ispec = specularColor * specular;
  vec3 Idiff = diffuseColor * diffuse;
  
  vec3 finalColor = Iamb + Idiff + Ispec;

  vertexColor = objColor*vec4(finalColor, 1.0);
}`;

const fragShaderCode2 = `#version 300 es
precision mediump float;

in vec4 vertexColor;

out vec4 vertColor;

void main() {

  vertColor = vertexColor;
  
  
}`;

// Vertex and fragment shader codes for phong shading
const vertexShaderCode3 = `#version 300 es
precision mediump float;

in vec3 aPosition; //incoming vertices
in vec3 aNormal; //incoming normals

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

out vec3 normal;
out vec3 viewPos; //viewers position

void main() {
    
  mat4 normalMatrix = transpose(inverse(uVMatrix * uMMatrix));
  vec3 vNormal = (normalMatrix * vec4(aNormal, 1.0)).xyz;//normal
  normal = normalize(vNormal);
    
  vec3 viewPos1 = (uVMatrix * uMMatrix * vec4(aPosition, 1.0)).xyz;//fragPosition
  viewPos = normalize(viewPos1);
  
  mat4 projectionModelView;
  projectionModelView=uPMatrix*uVMatrix*uMMatrix;
  gl_Position = projectionModelView*vec4(aPosition,1.0);

  
}`;

const fragShaderCode3 = `#version 300 es
precision mediump float;

in vec3 normal;
in vec3 viewPos;

uniform vec3 ambientColor;
uniform vec3 diffuseColor;
uniform vec3 specularColor;
uniform vec3 lightDirection;
uniform float shininess;
uniform float objectType;
uniform vec4 objColor;

out vec4 color;

void main() {

  vec3 lightDir = normalize(lightDirection - viewPos);

  vec3 viewVec = normalize(-viewPos);

  vec3 reflection = normalize(-reflect(lightDir,normal));

  vec3 Iamb = ambientColor;

  float diffuse = max(dot(normal, lightDir), 0.0);
  vec3 Idiff = diffuseColor * diffuse;

  float specular = 0.0;
  if(objectType == 1.0){
    specular = pow(max(dot(reflection, viewVec), 0.0), shininess);
  }

  vec3 Ispec = specularColor * specular;

  vec3 finalColor = Iamb + Idiff + Ispec;

  color = objColor*vec4(finalColor, 1.0);
  
}`;

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

function initShaders(vShaderCode, fShaderCode) {
  shaderProgram = gl.createProgram();

  var vertexShader = vertexShaderSetup(vShaderCode);
  var fragmentShader = fragmentShaderSetup(fShaderCode);

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
  gl.useProgram(shaderProgram);

  return shaderProgram;
}

//function for cube
function initCubeBuffer() {
  var vertices = [
    // Front face
    -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    // Back face
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
    // Top face
    -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    // Bottom face
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
    // Right face
    0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
    // Left face
    -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5,
  ];
  buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  buf.itemSize = 3;
  buf.numItems = vertices.length / 3;

  var indices = [
    0,
    1,
    2,
    0,
    2,
    3, // Front face
    4,
    5,
    6,
    4,
    6,
    7, // Back face
    8,
    9,
    10,
    8,
    10,
    11, // Top face
    12,
    13,
    14,
    12,
    14,
    15, // Bottom face
    16,
    17,
    18,
    16,
    18,
    19, // Right face
    20,
    21,
    22,
    20,
    22,
    23, // Left face
  ];
  indexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );
  indexBuf.itemSize = 1;
  indexBuf.numItems = indices.length;

  var cubeNormals = [
    // Front face
    0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
    // Back face
    0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
    // Top face
    0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
    // Bottom face
    0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
    // Right face
    1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
    // Left face
    -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
  ];

  var cubeNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeNormals), gl.STATIC_DRAW);
  cubeNormalBuf.itemSize = 3;
  cubeNormalBuf.numItems = cubeNormals.length / 3;
}

function drawCube(color) {
  objectType = 0.0;

  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.vertexAttribPointer(
    aPositionLocation,
    buf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);

  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.vertexAttribPointer(
    aNormalLocation,
    buf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.uniform4fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
  gl.uniform1f(uObjectType, objectType);
  gl.drawElements(gl.TRIANGLES, indexBuf.numItems, gl.UNSIGNED_SHORT, 0);
}

//function for sphere
function initSphere(nslices, nstacks, radius) {
  for (var i = 0; i <= nslices; i++) {
    var angle = (i * Math.PI) / nslices;
    var comp1 = Math.sin(angle);
    var comp2 = Math.cos(angle);

    for (var j = 0; j <= nstacks; j++) {
      var phi = (j * 2 * Math.PI) / nstacks;
      var comp3 = Math.sin(phi);
      var comp4 = Math.cos(phi);

      var xcood = comp4 * comp1;
      var ycoord = comp2;
      var zcoord = comp3 * comp1;

      spVerts.push(radius * xcood, radius * ycoord, radius * zcoord);
      spNormals.push(xcood, ycoord, zcoord);
    }
  }

  // now compute the indices here
  for (var i = 0; i < nslices; i++) {
    for (var j = 0; j < nstacks; j++) {
      var id1 = i * (nstacks + 1) + j;
      var id2 = id1 + nstacks + 1;

      spIndicies.push(id1, id2, id1 + 1);
      spIndicies.push(id2, id2 + 1, id1 + 1);
    }
  }
}

function initSphere(nslices, nstacks, radius) {
  for (var i = 0; i <= nslices; i++) {
    var angle = (i * Math.PI) / nslices;
    var comp1 = Math.sin(angle);
    var comp2 = Math.cos(angle);

    for (var j = 0; j <= nstacks; j++) {
      var phi = (j * 2 * Math.PI) / nstacks;
      var comp3 = Math.sin(phi);
      var comp4 = Math.cos(phi);

      var xcood = comp4 * comp1;
      var ycoord = comp2;
      var zcoord = comp3 * comp1;

      spVerts.push(radius * xcood, radius * ycoord, radius * zcoord);
      spNormals.push(xcood, ycoord, zcoord);
    }
  }

  // now compute the indices here
  for (var i = 0; i < nslices; i++) {
    for (var j = 0; j < nstacks; j++) {
      var id1 = i * (nstacks + 1) + j;
      var id2 = id1 + nstacks + 1;

      spIndicies.push(id1, id2, id1 + 1);
      spIndicies.push(id2, id2 + 1, id1 + 1);
    }
  }
}

function initSphereBuffer() {
  var nslices = 40;
  var nstacks = 40;
  var radius = 1.0;

  initSphere(nslices, nstacks, radius);

  // buffer for vertices
  spBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVerts), gl.STATIC_DRAW);
  spBuf.itemSize = 3;
  spBuf.numItems = spVerts.length / 3;

  // buffer for indices
  spIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(spIndicies),
    gl.STATIC_DRAW
  );
  spIndexBuf.itemsize = 1;
  spIndexBuf.numItems = spIndicies.length;

  // buffer for normals
  spNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
  spNormalBuf.itemSize = 3;
  spNormalBuf.numItems = spNormals.length / 3;
}

function drawSphere(color) {
  objectType = 1.0;

  gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    spBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);

  
  gl.vertexAttribPointer(
    aNormalLocation,
    spBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );
  gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);

  gl.uniform4fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
  gl.uniform1f(uObjectType, objectType);
  gl.drawElements(gl.TRIANGLES, spIndexBuf.numItems, gl.UNSIGNED_INT, 0);
}

//////////////////////////////////////////////////////////////////////
//Main drawing routine

//the flat shading part
function drawScene1() {
  gl.viewport(0, 0, gl.viewportWidth / 3, gl.viewportHeight);
  gl.scissor(0, 0, gl.viewportWidth / 3, gl.viewportHeight);
  gl.clearColor(0.9, 0.9, 0.95, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree1), [1, 0, 0]);

  //drawing all elements here
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.5, 0.8, 0.5]);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.5, 0.0]);
  var color = [0.9, 0.9, 0, 1];
  drawCube(color);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.3, 0.3, 0.3]);
  mMatrix = mat4.translate(mMatrix, [0.0, 1.0, 0.0]);
  var color = [0.0, 0.89, 1.0, 1.0];
  drawSphere(color);
  mMatrix = popMatrix(matrixStack);
}

//gouraud shading part
function drawScene2() {
  gl.viewport(gl.viewportWidth / 3, 0, gl.viewportWidth / 3, gl.viewportHeight);
  gl.scissor(gl.viewportWidth / 3, 0, gl.viewportWidth / 3, gl.viewportHeight);
  gl.clearColor(1.0, 0.78, 0.82, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree1), [1, 0, 0]);

  // drawing all elements here
  //sphere1
  color = [0.83, 0.83, 0.83, 1]; 
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.065, -0.36, 0]);
  mMatrix = mat4.scale(mMatrix, [0.42, 0.42, 0.42]);
  drawSphere(color);
  mMatrix = popMatrix(matrixStack, mMatrix);
//cube1
  color2 = [0, 1, 0, 1];
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.4, 0.07, 0]);
  mMatrix = mat4.scale(mMatrix, [0.42, 0.42, 0.42]);
  mMatrix = mat4.rotate(mMatrix, degToRad(45), [0, 0, 1]);
  drawCube(color2);
  mMatrix = popMatrix(matrixStack, mMatrix);

  //sphere 2
  color = [0.83, 0.83, 0.83, 1]; // specify color for the sphere
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.1, 0.43, 0]);
  mMatrix = mat4.scale(mMatrix, [0.25, 0.25, 0.25]);
  drawSphere(color);
  mMatrix = popMatrix(matrixStack, mMatrix);
  //cube2
  color2 = [0, 1, 0, 1];
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.2, 0.6, -0.15]);
  mMatrix = mat4.scale(mMatrix, [0.25, 0.25, 0.25]);
  mMatrix = mat4.rotate(mMatrix, degToRad(30), [0, 0, 1]);
  mMatrix = mat4.rotate(mMatrix, degToRad(25), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(30), [1, 0, 0]);
  drawCube(color2);
  mMatrix = popMatrix(matrixStack, mMatrix);
  //sphere3
  color = [0.83, 0.83, 0.83, 1]; // specify color for the sphere
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.15, 0.78, -0.05]);
  mMatrix = mat4.scale(mMatrix, [0.09, 0.09, 0.09]);
  drawSphere(color);
  mMatrix = popMatrix(matrixStack, mMatrix);
}

//phong shading part is here
function drawScene3() {
  gl.viewport(
    (gl.viewportWidth * 2) / 3,
    0,
    gl.viewportWidth / 3,
    gl.viewportHeight
  );
  gl.scissor(
    (gl.viewportWidth * 2) / 3,
    0,
    gl.viewportWidth / 3,
    gl.viewportHeight
  );
  gl.clearColor(0.82, 0.94, 0.77, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree1), [1, 0, 0]);

  // Now draw the sphere 1
  color = [0, 0.9, 1, 1]; 
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0, -0.7, 0]);
  mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 0.2]);
  drawSphere(color);
  mMatrix = popMatrix(matrixStack, mMatrix);

  //now draw plate 1
  color2 = [0.78, 0, 0.22, 1];
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0, -0.475, 0]);
  mMatrix = mat4.scale(mMatrix, [1.2, 0.05, 0.4]);
  drawCube(color2);
  mMatrix = popMatrix(matrixStack, mMatrix);

  // Now draw the sphere 2 and 3
  color = [0.29, 0, 0.51, 1]; 
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.4, -0.25, 0]);
  mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 0.2]);
  drawSphere(color);
  mMatrix = popMatrix(matrixStack, mMatrix);

  color = [0.03, 0.561, 0.561, 1]; 
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.4, -0.25, 0]);
  mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 0.2]);
  drawSphere(color);
  mMatrix = popMatrix(matrixStack, mMatrix);

  //now draw plate 2 and 3
  color2 = [0.9, 0.9, 0.22, 1];
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.4, -0.025, 0]);
  mMatrix = mat4.scale(mMatrix, [0.4, 0.05, 1.2]);
  drawCube(color2);
  mMatrix = popMatrix(matrixStack, mMatrix);

  color2 = [0.3, 0.9, 0.5, 1];
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.4, -0.025, 0]);
  mMatrix = mat4.scale(mMatrix, [0.4, 0.05, 1.2]);
  drawCube(color2);
  mMatrix = popMatrix(matrixStack, mMatrix);

  // Now draw the sphere 4 and 5
  color = [1, 0.08, 0.58, 1]; 
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [-0.4, 0.2, 0]);
  mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 0.2]);
  drawSphere(color);
  mMatrix = popMatrix(matrixStack, mMatrix);

  color = [0.78, 0.78, 0.47, 1]; 
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.4, 0.2, 0]);
  mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 0.2]);
  drawSphere(color);
  mMatrix = popMatrix(matrixStack, mMatrix);

  //now draw plate 4
  color2 = [0.78, 0, 0.22, 1];
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0, 0.425, 0]);
  mMatrix = mat4.scale(mMatrix, [1.2, 0.05, 0.4]);
  drawCube(color2);
  mMatrix = popMatrix(matrixStack, mMatrix);

  // Now draw the sphere 6
  color = [0.47, 0.53, 0.6, 1]; 
  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0, 0.65, 0]);
  mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 0.2]);
  drawSphere(color);
  mMatrix = popMatrix(matrixStack, mMatrix);
}

//handling mouse interaction with the canvas elements
function onMouseDown(event) {
  document.addEventListener("mousemove", onMouseMove, false);
  document.addEventListener("mouseup", onMouseUp, false);
  document.addEventListener("mouseout", onMouseOut, false);

  if (
    event.layerX <= canvas.width &&
    event.layerX >= 0 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    prevMouseX = event.clientX;
    prevMouseY = canvas.height - event.clientY;
  }
}

function onMouseMove(event) {
  // make mouse interaction only within canvas
  if (
    event.layerX <= canvas.width &&
    event.layerX >= 0 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    var mouseX = event.clientX;
    var diffX1 = mouseX - prevMouseX;
    prevMouseX = mouseX;
    degree0 = degree0 + diffX1 / 5;

    var mouseY = canvas.height - event.clientY;
    var diffY2 = mouseY - prevMouseY;
    prevMouseY = mouseY;
    degree1 = degree1 - diffY2 / 5;

    //draw flat shading
    lightValue = 10.0;
    shaderProgram = shaderPrograms(
      vertexShaderCode1,
      fragShaderCode1,
      lightValue / 20,
      0.6
    );
    drawScene1();

    //draw gouraud shading
    shaderProgram = shaderPrograms(
      vertexShaderCode2,
      fragShaderCode2,
      lightValue,
      10.0
    );
    drawScene2();

    //draw phong shading
    shaderProgram = shaderPrograms(
      vertexShaderCode3,
      fragShaderCode3,
      lightValue,
      10.0
    );
    drawScene3();
  }
}

function onMouseUp(event) {
  document.removeEventListener("mousemove", onMouseMove, false);
  document.removeEventListener("mouseup", onMouseUp, false);
  document.removeEventListener("mouseout", onMouseOut, false);
}

function onMouseOut(event) {
  document.removeEventListener("mousemove", onMouseMove, false);
  document.removeEventListener("mouseup", onMouseUp, false);
  document.removeEventListener("mouseout", onMouseOut, false);
}

// this function will initiate the corresponding shader programs, set vertices & all 
function shaderPrograms(vertexShaderCode, fragShaderCode, a, b) {
  // initialize shader program
  sProg = initShaders(vertexShaderCode, fragShaderCode);

  //get locations of attributes and uniforms declared in the shader
  aPositionLocation = gl.getAttribLocation(sProg, "aPosition");
  aNormalLocation = gl.getAttribLocation(sProg, "aNormal");
  uMMatrixLocation = gl.getUniformLocation(sProg, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(sProg, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(sProg, "uPMatrix");
  uColorLocation = gl.getUniformLocation(sProg, "objColor");
  uObjectType = gl.getUniformLocation(sProg, "objectType");// sphere or cube

  //the lighting effects
  uAmbientColorLocation = gl.getUniformLocation(sProg, "ambientColor");
  uDiffuseColorLocation = gl.getUniformLocation(sProg, "diffuseColor");
  uShininessLocation = gl.getUniformLocation(sProg, "shininess");
  lightDirectionUniformLocation = gl.getUniformLocation(
    sProg,
    "lightDirection"
  );
  uSpecularColorLocation = gl.getUniformLocation(sProg, "specularColor");
  uViewPosition = gl.getUniformLocation(sProg, "uViewPos");

  var newLightDirection = [a, b, 1.0]; // the position of light source
  const specularColor = [1.0, 1.0, 1.0]; // Set up specular color
  const ambientColor = [0.3, 0.3, 0.3]; // Set up ambient color
  const diffuseColor = [0.7, 0.7, 0.7]; // Set up diffuse color
  const shininess = 40.0; // Set up shininess/exponent

  gl.uniform3fv(lightDirectionUniformLocation, newLightDirection);
  gl.uniform3fv(uAmbientColorLocation, ambientColor);
  gl.uniform3fv(uDiffuseColorLocation, diffuseColor);
  gl.uniform3fv(uSpecularColorLocation, specularColor);
  gl.uniform3fv(uViewPosition, eyePos);
  gl.uniform1f(uShininessLocation, shininess);
  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);

  return sProg;
}


// this function is drawing all the scences and handle to range inputs
function drawScene() {
  const lightRange = document.getElementById("lightRange");
  var lightValue = parseFloat(lightRange.value);

  //draw flat shading
  shaderProgram = shaderPrograms(
    vertexShaderCode1,
    fragShaderCode1,
    lightValue / 20,
    0.6
  );
  drawScene1();

  //draw gouraud shading
  shaderProgram = shaderPrograms(
    vertexShaderCode2,
    fragShaderCode2,
    lightValue,
    10.0
  );
  drawScene2();

  //draw phong shading
  shaderProgram = shaderPrograms(
    vertexShaderCode3,
    fragShaderCode3,
    lightValue,
    10.0
  );
  drawScene3();

  //zoom-in and zoom-out
  eyeRange.addEventListener("input", () => {
    eyeValue = parseFloat(eyeRange.value);
    eyePos = [0.0, 0.0, eyeValue];
    shaderProgram = shaderPrograms(
      vertexShaderCode1,
      fragShaderCode1,
      lightValue / 20,
      0.6
    );
    drawScene1();
    shaderProgram = shaderPrograms(
      vertexShaderCode2,
      fragShaderCode2,
      lightValue,
      10.0
    );
    drawScene2();
    shaderProgram = shaderPrograms(
      vertexShaderCode3,
      fragShaderCode3,
      lightValue,
      10.0
    );
    drawScene3();
  });

  //light position change
  lightRange.addEventListener("input", () => {
    lightValue = parseFloat(lightRange.value);
    shaderProgram = shaderPrograms(
      vertexShaderCode1,
      fragShaderCode1,
      lightValue / 20,
      0.6
    );
    drawScene1();
    shaderProgram = shaderPrograms(
      vertexShaderCode2,
      fragShaderCode2,
      lightValue,
      10.0
    );
    drawScene2();
    shaderProgram = shaderPrograms(
      vertexShaderCode3,
      fragShaderCode3,
      lightValue,
      10.0
    );
    drawScene3();
  });
}

// This is the entry point from the html
function webGLStart() {
  canvas = document.getElementById("glCanvas2");
  document.addEventListener("mousedown", onMouseDown, false);

  // initialize WebGL
  initGL(canvas);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.SCISSOR_TEST);
  //initialize buffers for the square
  initSphereBuffer();
  initCubeBuffer();

  drawScene();
}
