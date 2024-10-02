// components/ImageUpload.js
import { useState } from 'react';

const ImageUpload = () => {
  const [file, setFile] = useState(null);

  const handleChange = (e) => {
    setFile(e.target.files[0]);
    // //console.log(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('file', file);
    //console.log(file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      //console.log('Image uploaded successfully!');
    } else {
      console.error('Image upload failed.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className=''>
      <input type="file" accept="image/*" onChange={handleChange} />
      {/* <button type="submit" className="buttonflex">Upload Image</button> */}
    </form>
  );
};

export default ImageUpload;
