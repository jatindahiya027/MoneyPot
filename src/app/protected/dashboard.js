import Image from "next/image";
import Areac from "./areachart";
import Piec from "./piechart";
export default function Dashboard(props) {
// console.log(props.transtables);
  
console.log("inside dashboard");

  return (
    <div className="data">
      <div className="dashdata">
        <h1 className="headname marg">Dashboard</h1>
        <p className="subhead">Analysis</p>
        <div className="graph maingraph">
          <div className="graphs areachart">
            <Areac transtables={props.transtables}/>
          
          </div>
          <div className="graphs piechart">
            <Piec catamount={props.catamount}/>
           
          </div>
        </div>
        <div className="place">
          <p className="subhead">Account Overview</p>
          <div className="graph equalspace">
            <div className="info light">
              <p>Credit</p>
              <p className="amount green">
                <span>₹</span>
                {props.creditdebit
        .filter(item => item['type'] === 'credit')
        .reduce((total, item) => total + item['amount'], 0)}
              </p>
            </div>
            <div className="info light">
              <p>Debit</p>
              <p className="amount red">
                <span>₹</span>{props.creditdebit
        .filter(item => item['type'] === 'debit')
        .reduce((total, item) => total + item['amount'], 0)}
              </p>
            </div>
            <div className="info light">
              <p>Saving</p>
              <p className="amount yellow">
                <span>₹</span>{
                props.creditdebit
                .reduce((total, item) => {
                  if (item['type'] === 'credit') return total + item['amount'];
                  if (item['type'] === 'debit') return total - item['amount'];
                  return total;
                }, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="profile">
        <h1 className="headname">Profile</h1>
        <div className="profiledata">
          <Image alt="image"
            src="/wom.jpeg"
            
            height={100}
            width={100}
            className="profimg"
          />
          <p>{props.user[0]?props.user[0]['name']:" "}</p>
          <div className="edit">
            <button className="profeditbutton">
              <Image alt="image" src="/edit.png" width={25} height={25} />
            </button>
            <button className="profeditbutton">
              <Image alt="image" src="/notification.png" width={25} height={25} />
            </button>
            <button className="profeditbutton">
              <Image alt="image" src="/logout.png" width={20} height={20} />
            </button>
          </div>
        </div>
        <div className="profsubhead">
          <p className="headname margin">Transfers</p>
          <p className="seemore">see more</p>
        </div>
        <div className="tabledb light">
          <table>
            <tbody>
              {props.trans.slice(0, 5).map((item, index) => (
                <tr key={index}>
                  <td>{item.type}</td>
                  <td>{item.date}</td>
                  <td>
                    <span>₹</span>
                    {item.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="catname">
          <div className="profsubhead">
            <p className="headname margin">Categories</p>
            <p className="seemore">see more</p>
          </div>
          <div className="categ light">
          {props.cate.slice(0, 3).map((item, index) => (
                <div className="categbox" key={index}>{item.name}</div>
              ))}
            
            
          </div>
        </div>
      </div>
    </div>
  );
}
