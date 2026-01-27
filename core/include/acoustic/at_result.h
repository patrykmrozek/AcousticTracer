#ifndef AT_RESULT_H
#define AT_RESULT_H

#include "at.h"
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>

static inline void AT_handle_result(const AT_Result res, const char *err_msg, ...)
{
    va_list args;
    va_start(args, err_msg);

    switch (res) {
        case AT_OK:
            break;

        default:
            vfprintf(stderr, err_msg, args);
            va_end(args);
            exit(1);
    }
}

#endif // AT_RESULT_H
