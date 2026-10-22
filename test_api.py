import urllib.request
import glob
import json

sample_images = glob.glob(r'C:\Users\kowsikan\Music\smartrice\rice_dataset\train\Basmati\*.jpg')
if sample_images:
    sample_path = sample_images[0]
    print('Testing with sample image:', sample_path)
    with open(sample_path, 'rb') as f:
        img_bytes = f.read()

    # 1. Test /predict/image
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    header_part = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="image"; filename="basmati_sample.jpg"\r\n'
        f'Content-Type: image/jpeg\r\n\r\n'
    ).encode()
    footer_part = f'\r\n--{boundary}--\r\n'.encode()
    body = header_part + img_bytes + footer_part

    req = urllib.request.Request(
        'http://127.0.0.1:8000/predict/image',
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
    )
    res = urllib.request.urlopen(req)
    print('\n[POST /predict/image Response]:')
    print(json.dumps(json.loads(res.read().decode()), indent=2))

    # 2. Test /predict/combined
    combined_body = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="image"; filename="basmati_sample.jpg"\r\n'
        f'Content-Type: image/jpeg\r\n\r\n'
    ).encode() + img_bytes + (
        f'\r\n--{boundary}\r\n'
        f'Content-Disposition: form-data; name="rice_variety"\r\n\r\nBasmati\r\n'
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="temperature"\r\n\r\n24.5\r\n'
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="humidity"\r\n\r\n58.0\r\n'
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="moisture_content"\r\n\r\n12.8\r\n'
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="storage_days"\r\n\r\n30\r\n'
        f'--{boundary}--\r\n'
    ).encode()

    req2 = urllib.request.Request(
        'http://127.0.0.1:8000/predict/combined',
        data=combined_body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
    )
    res2 = urllib.request.urlopen(req2)
    print('\n[POST /predict/combined Response]:')
    print(json.dumps(json.loads(res2.read().decode()), indent=2))

    # 3. Test /history
    res3 = urllib.request.urlopen('http://127.0.0.1:8000/history')
    print('\n[GET /history Response]:')
    print(json.dumps(json.loads(res3.read().decode()), indent=2))
