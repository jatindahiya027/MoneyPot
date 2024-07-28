import Image from "next/image";
export default function Categories() {
  console.log("inside categories");
  return (
    <div className="dashdata transdiv">
      <h1>Categories</h1>
      <p className="subhead">Debit</p>
      <div className="categories light">
        <div className="categitems">
          <Image alt="image" src="/house.png" width={40} height={40} />
          <button className="deletecat">
            <Image alt="image" src="/delete2.png" width={12} height={12} />
          </button>
          <p>Rent</p>
        </div>
        <div className="categitems">
          <Image alt="image" src="/apparal.png" width={40} height={40} />
          <button className="deletecat">
            <Image alt="image" src="/delete2.png" width={12} height={12} />
          </button>
          <p>Apparal</p>
        </div>
        <div className="categitems">
          <Image alt="image" src="/transportation.png" width={40} height={40} />
          <button className="deletecat">
            <Image alt="image" src="/delete2.png" width={12} height={12} />
          </button>
          <p>Transportation</p>
        </div>
        <div className="categitems">
          <Image alt="image" src="/food.png" width={40} height={40} />
          <button className="deletecat">
            <Image alt="image" src="/delete2.png" width={12} height={12} />
          </button>
          <p>Food</p>
        </div>
        <div className="categitems">
          <Image alt="image" src="/utilities.png" width={40} height={40} />
          <button className="deletecat">
            <Image alt="image" src="/delete2.png" width={12} height={12} />
          </button>
          <p>Utilities</p>
        </div>
        <div className="categitems">
          <Image alt="image" src="/healthcare.png" width={40} height={40} />
          <button className="deletecat">
            <Image alt="image" src="/delete2.png" width={12} height={12} />
          </button>
          <p>health care</p>
        </div>
        <div className="categitems">
          <Image alt="image" src="/personalcare.png" width={40} height={40} />
          <button className="deletecat">
            <Image alt="image" src="/delete2.png" width={12} height={12} />
          </button>
          <p>personal care</p>
        </div>
        <div className="categitems">
          <Image alt="image" src="/entertainment.png" width={40} height={40} />
          <button className="deletecat">
            <Image alt="image" src="/delete2.png" width={12} height={12} />
          </button>
          <p>entertainment</p>
        </div>
        <div className="categitems">
          <Image alt="image" src="/shopping.png" width={40} height={40} />
          <button className="deletecat">
            <Image alt="image" src="/delete2.png" width={12} height={12} />
          </button>
          <p>shopping</p>
        </div>
        <div className="categitems">
          <Image alt="image" src="/misallaneous.png" width={40} height={40} />
          <button className="deletecat">
            <Image alt="image" src="/delete2.png" width={12} height={12} />
          </button>
          <p>misallaneous</p>
        </div>
        <div className="categitems">
          <Image alt="image" src="/plus.png" width={12} height={12} />
          <p></p>
        </div>
      </div>
      <p className="subhead">Credit</p>
      <div className="categories light">
        <div className="categitems">
          <Image alt="image" src="/Salary.png" width={40} height={40} />
          <button className="deletecat">
            <Image alt="image" src="/delete2.png" width={12} height={12} />
          </button>
          <p>Salary</p>
        </div>
        <div className="categitems">
          <Image alt="image" src="/friend.png" width={40} height={40} />
          <button className="deletecat">
            <Image alt="image" src="/delete2.png" width={12} height={12} />
          </button>
          <p>Friends</p>
        </div>
        <div className="categitems">
          <Image alt="image" src="/external.png" width={40} height={40} />
          <button className="deletecat">
            <Image alt="image" src="/delete2.png" width={12} height={12} />
          </button>
          <p>External</p>
        </div>
        
        <div className="categitems">
          <Image alt="image" src="/plus.png" width={12} height={12} />
          <p></p>
        </div>
      </div>
    </div>
  );
}
