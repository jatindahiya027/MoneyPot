import Image from "next/image";
export default function Categories({cate}) {
  console.log("inside categories");
  return (
    <div className="dashdata transdiv">
      <h1>Categories</h1>
      <p className="subhead">Debit</p>
      <div className="categories light">
      {cate.filter(item => item.type === 'Debit').map((item, index) => (
  <div key={index} className="categitems">
    <Image alt="image" src={item.imgpath} width={40} height={40} />
    <button className="deletecat">
      <Image alt="image" src="/delete2.png" width={12} height={12} />
    </button>
    <p>{item.name}</p>
  </div>
))}
        <div className="categitems">
          <Image alt="image" src="/plus.png" width={12} height={12} />
          <p></p>
        </div>
      </div>
      <p className="subhead">Credit</p>
      <div className="categories light">
      {cate.filter(item => item.type === 'Credit').map((item, index) => (
  <div key={index} className="categitems">
    <Image alt="image" src={item.imgpath} width={40} height={40} />
    <button className="deletecat">
      <Image alt="image" src="/delete2.png" width={12} height={12} />
    </button>
    <p>{item.name}</p>
  </div>
))}
        
        <div className="categitems">
          <Image alt="image" src="/plus.png" width={12} height={12} />
          <p></p>
        </div>
      </div>
    </div>
  );
}
