
var last_frame=0
var slide_speed=60
var time=0

let camera_button = document.querySelector("#start-camera");
let video = document.querySelector("#video");
let canvas = document.querySelector("#canvas");
var started=false;
const SobelkernelGx=[];
const SobelkernelGy=[];
const Gausiankernel3By3=[];

//initialize the Sobel kernel
SobelkernelGx.push([-1,0,1],[-2,0,2],[-1,0,1]);
SobelkernelGy.push([1,2,1],[0,0,0],[-1,-2,-1]);

//initialize the gausian blur kernel
Gausiankernel3By3.push([16,8,16]);
Gausiankernel3By3.push([8,4,8]);
Gausiankernel3By3.push([16,8,16]);

var gausianBlurEnabled=false;
var ditheringEnabled=true;
var grayscaleEnabled=false;
var edgeDetectionEnabled=false;
var inversionEnabled=false;

//RGB active channels
var activeChannels=[true,true,true,true];
var ditheringBitDepth=16;
function getTimeStamp(){
return window.performance&&window.performance.now?
window.performance.now():new Date().getTime();
}

camera_button.addEventListener('click', async function() {
   	let stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
	video.srcObject = stream;
	started=true;
});





function update(){
  time=getTimeStamp()
if((last_frame+slide_speed)<=time&&started){
    last_frame=time
    const ctx=canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image=ctx.getImageData(0,0, canvas.width, canvas.height);
    editPixels(image,ctx);
}
	
requestAnimationFrame(update)
}

// rgb to decimal var dec = r << 16 + g << 16 + b;
 function editPixels(image,ctx) {
   
     // perfom floyd-Steinberg dithering
   if(ditheringEnabled)
    for(let col=0;col<canvas.height;col++){
     for(let row=0;row<canvas.width;row++){
	     	const index=(row*canvas.height+col)*4;
			const first=getPixel(row+1,col);
	        const second=getPixel(row-1,col+1);
	        const third=getPixel(row,col+1);
	        const fourth=getPixel(row+1,col+1);
	       
	        dither_pixel(image.data,first,
	        image.data[first]-find_closest_palette_color(image.data[index]));
			 dither_pixel(image.data,second,
	        image.data[second]-find_closest_palette_color(image.data[index]));
			 dither_pixel(image.data,third,
	        image.data[third]-find_closest_palette_color(image.data[index]));
				 dither_pixel(image.data,fourth,
	        image.data[fourth]-find_closest_palette_color(image.data[index]));
		
		
		}
		
	}
     
	//gray scale the image
	if(grayscaleEnabled)
   for(let row=0;row<canvas.width;row++){
		for(let col=0;col<canvas.height;col++){
	      const index=(row*canvas.height+col)*4;
	      const r=image.data[index]
	      const g=image.data[index+1]
	      const b=image.data[index+2]
	       const a=image.data[index+2]
	      // grayscale image 
	      const grayscale=(r+g+b+a)/3
	      setPixelValue(image.data,index,grayscale);
	     
		}
	}
	
	if(gausianBlurEnabled)
   calculateGausinanBlur(image.data);
   
   if(edgeDetectionEnabled)
   edgeDetection(image.data);
   
   if(inversionEnabled)
   invertColors(image.data);
   ctx.putImageData(image, 0, 0);
 
   
 }
  
  
  //edge detection using sobel's Algorithm
 function edgeDetection(data){
	 var largestMagnitude=1;
	  for(let col=1;col<canvas.height-1;col++){
     for(let row=1;row<canvas.width-1;row++){
		
		const index=getPixel(row,col);
		//apply Gradient XY
		const gx=applySobelGradient(data,row,col,SobelkernelGx);
		const gy=applySobelGradient(data,row,col,SobelkernelGy);
		const magnitude=Math.sqrt(gx*gx+gy*gy);
		
		if(magnitude>=largestMagnitude){
			largestMagnitude=magnitude;
		}
		setPixelValue(data,index,magnitude);   
		
	 }
	}
	
	
	 
	 for(let col=1;col<canvas.height-1;col++){
     for(let row=1;row<canvas.width-1;row++){
			const index=getPixel(row,col);
		    const normal=(data[index]/largestMagnitude)
		     if(activeChannels[0])
		     data[index]= normal*255;
		      if(activeChannels[1])
		     data[index+1]=normal*255;
		      if(activeChannels[2])
		     data[index+2]=normal*255;
		     //data[index+3]=normal*255; 
		 }
	}
	 
 } 
  
  
  function invertColors(data){
  for(let col=1;col<canvas.height-1;col++){
     for(let row=1;row<canvas.width-1;row++){
		 const index=getPixel(row,col);
		    if(activeChannels[0])
			 data[index]=Math.abs(data[index]-255);
			  if(activeChannels[1])
			 data[index+1]=Math.abs(data[index+1]-255);
			  if(activeChannels[2])
			 data[index+2]=Math.abs(data[index+2]-255); 	 
		 
	}
  }
}
  
  
  function calculateGausinanBlur(data){
	  const output=[];
	   for(let row=1;row<canvas.width-1;row++){
	for(let col=1;col<canvas.height-1;col++){
		const index=getPixel(row,col);
		 applyGausianBlur(data,row,col,output);
		    if(activeChannels[0])
		    data[index]= output[0];
		     if(activeChannels[1])
		    data[index+1]=output[1];
		     if(activeChannels[2])
		    data[index+2]=output[2];
		     if(activeChannels[3])
		    data[index+3]=output[3];
		    output.splice(0,output.length);
	   }
		
	}
	  
  }
 
 
 //apply gausion blur
 function applyGausianBlur(data,row,col,output){
	 //center
	const center_value1R=1/Gausiankernel3By3[1][1]*data[getPixel(row,col)];
	const center_value1G=1/Gausiankernel3By3[1][1]*data[getPixel(row,col)+1];
	const center_value1B=1/Gausiankernel3By3[1][1]*data[getPixel(row,col)+2];
	const center_value1A=1/Gausiankernel3By3[1][1]*data[getPixel(row,col)+3];
	
	const center_value2R=1/Gausiankernel3By3[0][1]*data[getPixel(row-1,col)];
	const center_value2G=1/Gausiankernel3By3[0][1]*data[getPixel(row-1,col)+1];
	const center_value2B=1/Gausiankernel3By3[0][1]*data[getPixel(row-1,col)+2];
	const center_value2A=1/Gausiankernel3By3[0][1]*data[getPixel(row-1,col)+3];
	
	const center_value3R=1/Gausiankernel3By3[2][1]*data[getPixel(row+1,col)]; 
	const center_value3G=1/Gausiankernel3By3[2][1]*data[getPixel(row+1,col)+1]; 
	const center_value3B=1/Gausiankernel3By3[2][1]*data[getPixel(row+1,col)+2]; 
	const center_value3A=1/Gausiankernel3By3[2][1]*data[getPixel(row+1,col)+3]; 

	  //top
	const top_value1R=1/Gausiankernel3By3[0][0]*data[getPixel(row-1,col-1)];
	const top_value1G=1/Gausiankernel3By3[0][0]*data[getPixel(row-1,col-1)+1];
	const top_value1B=1/Gausiankernel3By3[0][0]*data[getPixel(row-1,col-1)+2];
	const top_value1A=1/Gausiankernel3By3[0][0]*data[getPixel(row-1,col-1)+3];

	const top_value2R=1/Gausiankernel3By3[1][0]*data[getPixel(row,col-1)];
	const top_value2G=1/Gausiankernel3By3[1][0]*data[getPixel(row,col-1)+1];
	const top_value2B=1/Gausiankernel3By3[1][0]*data[getPixel(row,col-1)+2];
	const top_value2A=1/Gausiankernel3By3[1][0]*data[getPixel(row,col-1)+3];
	
	const top_value3R=1/Gausiankernel3By3[2][0]*data[getPixel(row+1,col-1)];
	const top_value3G=1/Gausiankernel3By3[2][0]*data[getPixel(row+1,col-1)+1];
	const top_value3B=1/Gausiankernel3By3[2][0]*data[getPixel(row+1,col-1)+2];
	const top_value3A=1/Gausiankernel3By3[2][0]*data[getPixel(row+1,col-1)+3];
	
	 //bottom
	const bottom_value1R=1/Gausiankernel3By3[0][2]*data[getPixel(row-1,col+1)];
	const bottom_value1G=1/Gausiankernel3By3[0][2]*data[getPixel(row-1,col+1)+1];
	const bottom_value1B=1/Gausiankernel3By3[0][2]*data[getPixel(row-1,col+1)+2];
	const bottom_value1A=1/Gausiankernel3By3[0][2]*data[getPixel(row-1,col+1)+3];
	
	const bottom_value2R=1/Gausiankernel3By3[1][2]*data[getPixel(row,col+1)];
	const bottom_value2G=1/Gausiankernel3By3[1][2]*data[getPixel(row,col+1)+1];
	const bottom_value2B=1/Gausiankernel3By3[1][2]*data[getPixel(row,col+1)+2];
	const bottom_value2A=1/Gausiankernel3By3[1][2]*data[getPixel(row,col+1)+3];
	
	const bottom_value3R=1/Gausiankernel3By3[2][2]*data[getPixel(row+1,col+1)];
	const bottom_value3G=1/Gausiankernel3By3[2][2]*data[getPixel(row+1,col+1)+1];
	const bottom_value3B=1/Gausiankernel3By3[2][2]*data[getPixel(row+1,col+1)+2];
	const bottom_value3A=1/Gausiankernel3By3[2][2]*data[getPixel(row+1,col+1)+3];
	
	const R=center_value1R+center_value2R+center_value3R
	+top_value1R+top_value2R+top_value3R+bottom_value1R+bottom_value2R+bottom_value3R;
	const G=center_value1G+center_value2G+center_value3G
	+top_value1G+top_value2G+top_value3G+bottom_value1G+bottom_value2G+bottom_value3G;
	const B=center_value1B+center_value2B+center_value3B
	+top_value1B+top_value2B+top_value3B+bottom_value1B+bottom_value2B+bottom_value3B;
	const A=center_value1A+center_value2A+center_value3A
	+top_value1A+top_value2A+top_value3A+bottom_value1A+bottom_value2A+bottom_value3A;
	
	output.push(R);
	output.push(G);
	output.push(B);
	output.push(A);
	
	 return output;
 }
 
 //apply Sobel Gradient
 function applySobelGradient(data,row,col,kernel){
		//center
		const center_value2=kernel[0][1]*data[getPixel(row-1,col)];
		const center_value1=kernel[1][1]*data[getPixel(row,col)];
		const center_value3=kernel[2][1]*data[getPixel(row+1,col)];
		//top
		const top_value1=kernel[0][0]*data[getPixel(row-1,col-1)];
		const top_value2=kernel[1][0]*data[getPixel(row,col-1)];
		const top_value3=kernel[2][0]*data[getPixel(row+1,col-1)];
		//bottom
		const bottom_value1=kernel[0][2]*data[getPixel(row-1,col+1)];
		const bottom_value2=kernel[1][2]*data[getPixel(row,col+1)];
		const bottom_value3=kernel[2][2]*data[getPixel(row+1,col+1)];
		
		const total=center_value1+center_value2+center_value3
		+top_value1+top_value2+top_value3+
		bottom_value1+bottom_value2+bottom_value3;
		return total;
 }
  
  function dither_pixel(data,index,quant_error){
	  if(activeChannels[0])
	 data[index]=data[index]+quant_error*7/ditheringBitDepth;
	  if(activeChannels[1])
	 data[index+1]=data[index+1]+quant_error*3/ditheringBitDepth;
	  if(activeChannels[2])
	 data[index+2]=data[index+2]+quant_error*5/ditheringBitDepth;
	 data[index+3]=data[index+3]+quant_error*1/ditheringBitDepth;  
  }
  
  function getPixel(row,col){
	   return(col*canvas.width+row)*4; 
  }
  
  function setPixelValue(data,index,value){
	   if(activeChannels[0])
	  data[index]=value;
	   if(activeChannels[1])
	  data[index+1]=value;
	   if(activeChannels[2])
	  data[index+2]=value;
	  data[index+3]=value;
	 
  }
  
   function find_closest_palette_color(oldpixel){
	    return Math.round(oldpixel/255);  
   }
   
   
   function toggleBitDepth(selectObject){
	   var opt=selectObject.options[selectObject.selectedIndex];
	     
	     switch(opt.text){
			 
			case "4Bit":
			 ditheringBitDepth=4;
			 break;
			case "8Bit":
			ditheringBitDepth=8;
			 break;
			case "16Bit":
			ditheringBitDepth=16;
			 break;
			case "32Bit":
			ditheringBitDepth=32;
			 break;
			case "64Bit":
			ditheringBitDepth=64;
			 break;
			 
		 }
   }
   
   function toggleDithering(){
	   ditheringEnabled=!ditheringEnabled;
	  document.getElementById("ditheringBox").checked=ditheringEnabled;
	   
   }
   
   function toggleGrayscale(){
	  grayscaleEnabled=!grayscaleEnabled;
	  document.getElementById("grayscaleBox").checked=grayscaleEnabled;
	
   }
   
   function toggleGausianBlur(){
	  gausianBlurEnabled=!gausianBlurEnabled;
	  document.getElementById("gausionBox").checked=gausianBlurEnabled;
	 
   }
   
   function toggleInversion(){
	  inversionEnabled=!inversionEnabled;
	  document.getElementById("inversionBox").checked=inversionEnabled;
	 
   }
   
   function toggleEdgeDetection(){
	  edgeDetectionEnabled=!edgeDetectionEnabled;
	  document.getElementById("edgeDetectionBox").checked=edgeDetectionEnabled;
	   
   }
   
   
   function toggleRedChannel(){
	   activeChannels[0]=!activeChannels[0];
	   activeChannels[0]=activeChannels[0];
	   document.getElementById("red").checked=activeChannels[0];
	
   }
   
   function toggleGreenChannel(){
	    activeChannels[1]=!activeChannels[1];
	    activeChannels[1]=activeChannels[1];
	    document.getElementById("green").checked=activeChannels[1];
	
   }
   
   function toggleBlueChannel(){
	    activeChannels[2]=!activeChannels[2];
	    activeChannels[2]=activeChannels[2];
	    document.getElementById("blue").checked=activeChannels[2];
	
   }
update()

