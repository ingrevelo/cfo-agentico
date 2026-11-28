**De:** cesar
**Para:** juan-carlos · **Rama:** —

En producción, `POST /api/perfilado` devuelve 4 propuestas y una es "Banco local (CBU propio)": los 6 movimientos `conversion_y_retiro` de USD 1.400, entre los días 3 y 5. El perfilador lo trata como un pago recurrente, así que al confirmarlo se agregaría como **vencimiento** de 1.400 USD. Según `docs/caso-de-prueba.md` (fase 1, P4), ese patrón es el "pasamanos": no es una obligación sino lo que Sofía hacía sin plan, y se muestra como contrafactual ("lo que habría hecho", 1.2).

**Necesito:** que `domain/perfilador.py` distinga ese caso. Propuesta: los patrones de tipo `conversion_y_retiro` hacia una cuenta propia salen como `categoria="pasamanos"` (o en una lista aparte de `ResultadoPerfilado`) y no como propuesta de vencimiento. Cuando lo tengas, ajusto `api/servicio_perfilado.py` para mostrarlo como contrafactual y no ofrecer "agregar vencimiento". Mientras tanto no toco el perfilador.
