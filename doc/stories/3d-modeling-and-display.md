# 3D Modeling and Display Pipeline Integration

This document outlines the technical architecture and functional requirements for integrating an AI-driven 3D modeling pipeline and an interactive 3D showroom into the existing Next.js + Payload CMS furniture website.

## 1. Feature Overview

The goal is to automate the creation of 3D assets from product photography and provide an immersive "Room Tour" experience where users can virtually place furniture into a living room environment.

## 2. Technical Pipeline Architecture

### Phase A: CMS & Data Ingestion (Payload CMS)
- **Collection Update**: A new `3D Models` field added to the `Furniture` collection.
- **Input**: Admin uploads 1-4 high-quality photos (Front, Back, Left, Right) of a furniture item.
- **Trigger**: A Payload CMS `afterChange` hook triggers an asynchronous backend process via Webhook.

### Phase B: AI Generation & Optimization (Server-side)
- **Generation**: Trigger a serverless function (Node.js/Python) that calls Image-to-3D APIs, use Meshy at the moment.
- **Processing Pipeline**:
    1. **Inference**: Generate raw `.obj` or `.glb` mesh.
    2. **Optimization**: Automated decimation using `Simplygon` or `gltf-pipeline` to reduce polygon count for web performance.
    3. **Texture Baking**: Convert AI-generated vertex colors into PBR textures (Diffuse, Roughness, Normal).
- **Storage**: The optimized `.glb` file is uploaded back to the Payload CMS Media Library and linked to the furniture entry.

### Phase C: Interactive 3D Showroom (Frontend)
- **Technology Stack**: React Three Fiber (R3F) + Three.js + Drei.
- **URL Structure**: `/visualizer` or `/[room-category]/[furniture-category]/[name]/3d-tour`.
- **UI Components**:
    - **Main Viewport**: A pre-rendered 3D living room environment (GLTF scene).
    - **Selection Sidebar**: A scrollable list of furniture categories and items (fetched from Payload).
    - **Interaction Logic**: 
        - Clicking an item in the sidebar instantiates the 3D model into the scene.
        - Users can rotate the view and move furniture within the virtual space.

## 3. Detailed UI Requirements

### Virtual Showroom Page
- **Navigation**: Persistent global header from the main site.
- **Layout**:
    - **Left Column (25%)**: Categorized list (e.g., Living Room, Bedroom) with thumbnail previews of furniture.
    - **Main Column (75%)**: Full-screen 3D canvas with interactive controls (OrbitControls).
- **Features**:
    - "Add to Room" functionality.
    - Material/Texture toggling (if multiple variants exist in CMS).
    - "Inquire" button linked back to the product detail page.

## 4. Implementation Steps

1. **Backend Integration**: Set up a dedicated worker or serverless route to handle long-running AI generation tasks.
2. **Payload CMS Schema Extension**: Add fields for `3d_file`, `is_processing`, and `ai_generation_log`.
3. **Showroom Development**: Build the 3D scene using React Three Fiber, ensuring responsive scaling for mobile and desktop.
4. **Performance Tuning**: Implement lazy loading for 3D models to ensure fast initial page loads.
