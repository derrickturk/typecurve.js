import sys

def main(args, output):
    min_oil_months = int(args[1])

    with open(args[0]) as f:
        hdr = f.readline().rstrip().split('\t')
        data = [dict(zip(hdr, l.rstrip().split('\t'))) for l in f]

    by_well = []
    last_uid = ''
    record = None
    for d in data:
        uid = d['UID']
        if uid != last_uid:
            if record is not None:
                strip_zeros(record)
                if (len(record['Oil']) > min_oil_months):
                    by_well.append(record)
            last_uid = uid
            record = dict()
            record['UID'] = uid
            record['API'] = d['API'] or 'null'
            record['Name'] = d['Name'].replace("'", r"\'")
            record['Latitude'] = d['Latitude'] or 'null'
            record['Longitude'] = d['Longitude'] or 'null'
            record['Month'] = list()
            record['Oil'] = list()
            record['Gas'] = list()
            record['Water'] = list()
        record['Month'].append(d['Month'])
        record['Oil'].append(d['Oil'])
        record['Gas'].append(d['Gas'])
        record['Water'].append(d['Water'])
    if last_uid:
        strip_zeros(record)
        if (len(record['Oil']) > min_oil_months):
            by_well.append(record)

    if len(args) == 3:
        output.write('var ' + args[2] + ' = ')

    output.write("{\n\t'header': [")
    output.write(','.join("\n\t\t{ 'uid': '" + w['UID'] + "', 'api': '" +
        w['API'] + "', 'name': '" + w['Name'] + "', 'lat': " + w['Latitude'] +
        ", 'lon': " + w['Longitude'] + " }" for w in by_well))

    output.write("\n\t],\n\t'month': [")
    output.write(','.join("\n\t\t[ " + ', '.join("'" + x + "'" for x in w['Month']) +
        " ]" for w in by_well))

    output.write("\n\t],\n\t'oil': [")
    output.write(','.join("\n\t\t[ " + ', '.join(w['Oil']) +
        " ]" for w in by_well))

    output.write("\n\t],\n\t'gas': [")
    output.write(','.join("\n\t\t[ " + ', '.join(w['Gas']) +
        " ]" for w in by_well))

    output.write("\n\t],\n\t'water': [")
    output.write(','.join("\n\t\t[ " + ', '.join(w['Water']) +
        " ]" for w in by_well))

    output.write("\n\t]\n}")

def strip_zeros(rec):
    i = 0
    while i < len(rec['Oil']) and rec['Oil'][i] == '0':
        i += 1

    rec['Month'] = rec['Month'][i:]
    rec['Oil'] = rec['Oil'][i:]
    rec['Gas'] = rec['Gas'][i:]
    rec['Water'] = rec['Water'][i:]

    i = len(rec['Oil'])
    while i > 0 and rec['Oil'][i - 1] == '0':
        i -= 1

    rec['Month'] = rec['Month'][0:i]
    rec['Oil'] = rec['Oil'][0:i]
    rec['Gas'] = rec['Gas'][0:i]
    rec['Water'] = rec['Water'][0:i]

if __name__ == '__main__':
    if len(sys.argv) < 3 or len(sys.argv) > 4:
        print('Usage: {0} tsv-file min-nonzero-oil [var-name]'.format(
            sys.argv[0]), file=sys.stderr)
        sys.exit(0)

    sys.exit(main(sys.argv[1:], sys.stdout))
