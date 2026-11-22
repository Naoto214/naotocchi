"""Compare the two tested V12 candidates without treating separate browser runs as identical checkpoints."""
import argparse
from collections import Counter
import gzip
import json
from pathlib import Path
import zipfile

from matrix_report_v12 import ARMS,FIELDS,HERE,REFERENCE,legacy,old,prior,v11


def home_metrics(cell, arm):
    residents,inputs,aged,targets=[],[],[],[]
    v11.add_household(cell,arm,residents,inputs,aged,targets,Counter(),Counter())
    metrics=legacy.digest_group(residents,inputs,aged,targets)
    return {k:metrics[k] for k in FIELDS}, {r["key"]:r["normalCompletions"] for r in residents}


def archive(root, receipt, region):
    row=receipt["regions"][region]
    path=root/row["run"]/f"mobility-v12-{row['run']}-{region}.zip"
    old.require(old.digest(path.read_bytes())==row["sha256"],"certified original changed")
    return zipfile.ZipFile(path)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--archives",type=Path,required=True)
    p.add_argument("--first",type=Path,required=True,help="certified first summary directory")
    p.add_argument("--final",type=Path,default=HERE/"evidence",help="certified final summary directory")
    p.add_argument("--private-data",type=Path,required=True)
    args=p.parse_args()
    first,final=[json.loads((directory/"matrix-receipt.json").read_bytes()) for directory in (args.first,args.final)]
    old.require(first["identity"][REFERENCE]==final["identity"][REFERENCE] and first["base"]==final["base"],
                "reference runtime or origin differs between workflows")
    rows=[]
    for region in old.REGIONS:
        with archive(args.archives,first,region) as a, archive(args.archives,final,region) as b:
            cells=[n for n in a.namelist() if n.endswith(".json.gz")]
            old.require(len(cells)==20 and set(cells)=={n for n in b.namelist() if n.endswith(".json.gz")},"regional cells differ")
            for name in sorted(cells):
                before,after=[json.loads(gzip.decompress(z.read(name))) for z in (a,b)]
                row={**v11.label(after)}
                pa,pb=[c["shared"][REFERENCE] for c in (before,after)]
                row.update(identicalFullOpening=before["arms"][REFERENCE]["alignedOpeningSHA256"]==after["arms"][REFERENCE]["alignedOpeningSHA256"],
                    identicalFiveMinuteDonorFeet=pa["opening"]==pb["opening"],identicalPostLivingFinger=pa["input"]==pb["input"],
                    identicalFullPostLivingDonor=pa["snapshot"]==pb["snapshot"])
                for arm in ARMS:
                    (m1,w1),(m2,w2)=[home_metrics(c,arm) for c in (before,after)]
                    row[arm+"LostNormal"]="|".join(k for k in sorted(w1) if w1[k] and not w2[k])
                    row[arm+"GainedNormal"]="|".join(k for k in sorted(w1) if w2[k] and not w1[k])
                    row[arm+"ChangedRestoredTouch"]=bool(v11.replay_difference(pa["replays"][arm]["row"],pb["replays"][arm]["row"]))
                    for k in FIELDS:
                        row[arm+k]=m2[k]-m1[k]
                rows.append(row)
    old.require(len(rows)==260,"missing repeated homes")
    controlled=[r for r in rows if r["identicalFullPostLivingDonor"] and r["identicalPostLivingFinger"]]
    comparison={"firstRun":first["run"],"finalRun":final["run"],"cells":len(rows),
              "sameReferenceSource":True,"sameFullOpening":sum(r["identicalFullOpening"] for r in rows),
              "sameReferenceAgedFeet":sum(r["identicalFiveMinuteDonorFeet"] for r in rows),
              "sameReferenceAgedSnapshotAndFinger":len(controlled),
              "changedRestoredResultsOnIdenticalCheckpoint":{a:sum(r[a+"ChangedRestoredTouch"] for r in controlled) for a in ARMS},
              "changesAcrossRuns":{a:{k:sum(r[a+k] for r in rows) for k in FIELDS} for a in ARMS}}
    legacy.csv_write(args.private_data/"matrix-two-cohorts.csv.gz",rows)
    legacy.write_json(args.final/"matrix-two-cohorts.json",comparison)
    print(comparison)


if __name__=="__main__":
    main()
